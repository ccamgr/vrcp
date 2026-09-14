use crate::utils::constants;
use keyring::Entry;
use reqwest::Client;
use reqwest_cookie_store::CookieStoreMutex;
use std::path::PathBuf;
use std::sync::Arc;
use vrchatapi::apis::configuration::Configuration;

const KEYRING_SERVICE: &str = "cc.amgr.vrcp.desktop";
const KEYRING_ACCOUNT: &str = "vrchat-cookie-store";

// Service struct to manage VRChat API state
#[derive(Clone)]
pub struct VrcApiService {
    pub config: Arc<tokio::sync::Mutex<Configuration>>,
    cookie_store: Arc<CookieStoreMutex>,
}

impl VrcApiService {
    // Initialize the service using the application data directory
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        // 1. Resolve application data directory
        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir)
                .map_err(|e| format!("Failed to create app dir: {}", e))?;
        }

        let cookie_store = match load_cookie_store() {
            Ok(store) => store,
            Err(error) => {
                let message =
                    format!("Failed to load cookies from the OS credential store: {error}");
                eprintln!("{message}");
                crate::append_startup_error(&message);
                reqwest_cookie_store::CookieStore::default()
            }
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
        })
    }

    // Call this method to save cookies to disk after login or operations
    pub fn save_cookies(&self) -> Result<(), String> {
        let store = self.cookie_store.lock().unwrap();
        let serialized = serde_json::to_vec(&*store).map_err(|e| e.to_string())?;
        cookie_entry()?
            .set_secret(&serialized)
            .map_err(|e| format!("Failed to save cookies to the OS credential store: {e}"))?;
        Ok(())
    }

    pub fn clear_cookies(&self) -> Result<(), String> {
        {
            let mut store = self.cookie_store.lock().unwrap();
            store.clear(); // reqwest_cookie_store の中身を空にする
        }
        cookie_entry()?
            .delete_credential()
            .map_err(|e| format!("Failed to remove cookies from the OS credential store: {e}"))
    }
}

fn cookie_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT)
        .map_err(|e| format!("Failed to initialize the OS credential store: {e}"))
}

fn load_cookie_store() -> Result<reqwest_cookie_store::CookieStore, String> {
    let entry = cookie_entry()?;
    match entry.get_secret() {
        Ok(serialized) => serde_json::from_slice(&serialized)
            .map_err(|e| format!("Failed to read cookies from the OS credential store: {e}")),
        Err(keyring::Error::NoEntry) => Ok(reqwest_cookie_store::CookieStore::default()),
        Err(e) => Err(format!("Failed to access the OS credential store: {e}")),
    }
}
