use crate::utils::constants;
use keyring::Entry;
use reqwest::{Client, Request, Response};
use reqwest_cookie_store::CookieStoreMutex;
use reqwest_middleware::{ClientBuilder, Middleware, Next, Result as MiddlewareResult};
use std::path::PathBuf;
use std::sync::Arc;
use vrchatapi::apis::configuration::Configuration;

const KEYRING_SERVICE: &str = "cc.amgr.vrcp.desktop";
const KEYRING_ACCOUNT: &str = "vrchat-cookie-store";

struct ApiResponseLogger;

#[async_trait::async_trait]
impl Middleware for ApiResponseLogger {
    async fn handle(
        &self,
        request: Request,
        extensions: &mut http::Extensions,
        next: Next<'_>,
    ) -> MiddlewareResult<Response> {
        let method = request.method().to_string();
        let url = request.url().to_string();
        let response = next.run(request, extensions).await?;
        let status = response.status();
        let raw_response: http::Response<reqwest::Body> = response.into();
        let (parts, body) = raw_response.into_parts();
        let headers = parts.headers.clone();
        let version = parts.version;
        let body = Response::from(http::Response::from_parts(parts, body));
        let bytes = body.bytes().await?;
        let content = String::from_utf8_lossy(&bytes);
        crate::logging::api_response(&method, &url, status.as_u16(), &content);

        let mut rebuilt = http::Response::new(bytes);
        *rebuilt.status_mut() = status;
        *rebuilt.version_mut() = version;
        *rebuilt.headers_mut() = headers;
        Ok(Response::from(rebuilt))
    }
}

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
                crate::logging::error("credential_store.load", &[("error", &message)]);
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
        config.client = ClientBuilder::new(client).with(ApiResponseLogger).build();
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
        match cookie_entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!(
                "Failed to remove cookies from the OS credential store: {error}"
            )),
        }
    }

    pub fn discard_cookies(&self) {
        if let Err(error) = self.clear_cookies() {
            crate::logging::warn("credential_store.clear", &[("error", &error)]);
        }
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
