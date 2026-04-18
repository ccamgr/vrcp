use reqwest::Client;
use reqwest_cookie_store::CookieStoreMutex;
use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::path::PathBuf;
use std::sync::Arc;
use vrchatapi::apis::configuration::Configuration;
use crate::utils::constants;

// Service struct to manage VRChat API state
#[derive(Clone)]
pub struct VrcApiService {
    pub config: Arc<tokio::sync::Mutex<Configuration>>,
    cookie_store: Arc<CookieStoreMutex>,
    cookie_path: PathBuf,
}

impl VrcApiService {
    // Initialize the service using the application data directory
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        // 1. Resolve application data directory
        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir)
                .map_err(|e| format!("Failed to create app dir: {}", e))?;
        }

        let cookie_path = app_dir.join("cookies.json");

        // 2. Load existing cookies from file, or create a new store
        let cookie_store = if cookie_path.exists() {
            let file = File::open(&cookie_path).map_err(|e| e.to_string())?;
            let reader = BufReader::new(file);
            reqwest_cookie_store::CookieStore::load_json(reader).unwrap_or_default()
        } else {
            reqwest_cookie_store::CookieStore::default()
        };

        let cookie_store = Arc::new(CookieStoreMutex::new(cookie_store));

        // 3. Build reqwest client with the persistent cookie store
        let client = Client::builder()
            .cookie_provider(Arc::clone(&cookie_store))
            .build()
            .map_err(|e| e.to_string())?;

        // 4. Set up VRChat API configuration
        let mut config = Configuration::new();
        config.client = client;
        config.user_agent = Some(constants::get_user_agent());

        Ok(Self {
            config: Arc::new(tokio::sync::Mutex::new(config)),
            cookie_store,
            cookie_path,
        })
    }

    // Call this method to save cookies to disk after login or operations
    pub fn save_cookies(&self) -> Result<(), String> {
        let file = File::create(&self.cookie_path).map_err(|e| e.to_string())?;
        let mut writer = BufWriter::new(file);
        let store = self.cookie_store.lock().unwrap();
        store.save_json(&mut writer).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn clear_cookies(&self) -> Result<(), String> {
        {
            let mut store = self.cookie_store.lock().unwrap();
            store.clear(); // reqwest_cookie_store の中身を空にする
        }
        self.save_cookies() // 空になった状態を cookies.json に上書き保存
    }
}
