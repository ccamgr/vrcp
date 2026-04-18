use serde::{Deserialize, Serialize};
use tauri::State;
use vrchatapi::apis::authentication_api::{get_current_user, logout as vrc_logout, verify2_fa, verify2_fa_email_code};
use vrchatapi::models::{
    RegisterUserAccount200Response::{CurrentUser, RequiresTwoFactorAuth},
    TwoFactorEmailCode,
    TwoFactorAuthCode,
};
use specta::Type;

use crate::modules::vrcapi::VrcApiService;


#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct LoginResponse {
    user: Option<String>, // ログイン成功してユーザー情報が取れた場合はユーザー名を入れる
    #[serde(rename = "requires2fa")]
    requires_2fa: bool,   // 2FAが必要な場合はtrue
    #[serde(rename = "type2fa")]
    type_2fa: Vec<String>, // 2FAの種類（例: "emailOtp", "otp", "totp"）を入れる
}

// Check current login status using saved cookies
#[tauri::command]
#[specta::specta]
pub async fn check_auth(state: State<'_, VrcApiService>) -> Result<LoginResponse, String> {
    let config = state.config.lock().await;

    // Call API with existing cookies
    match get_current_user(&config).await {
        Ok(response) => {
            match response {
                CurrentUser(user) => {
                    // Valid session exists
                    Ok(LoginResponse {
                        user: Some(user.display_name.clone()),
                        requires_2fa: false,
                        type_2fa: Vec::new(),
                    })
                }
                RequiresTwoFactorAuth(_) => {
                    // Session requires 2FA to proceed
                    Err(format!("Session exists but requires 2FA. Please log in again with 2FA."))
                }
            }
        }
        Err(e) => Err(format!("Not logged in or session expired: {}", e)),
    }
}
// Login with username and password
#[tauri::command]
#[specta::specta]
pub async fn login(
    username: String,
    password: String,
    state: State<'_, VrcApiService>
) -> Result<LoginResponse, String> {
    let mut config = state.config.lock().await;

    // Set Basic Auth credentials
    config.basic_auth = Some((username, Some(password)));

    // Make the request
    let result = get_current_user(&config).await;

    // Clear Basic Auth
    config.basic_auth = None;

    match result {
        Ok(response) => {
            // Save cookies because auth state changed (either success or partial success for 2FA)
            if let Err(save_err) = state.save_cookies() {
                eprintln!("Failed to save cookies: {}", save_err);
            }

            match response {
                CurrentUser(user) => {
                    Ok(LoginResponse {
                        user: Some(user.display_name.clone()),
                        requires_2fa: false,
                        type_2fa: Vec::new(),
                    })
                }
                RequiresTwoFactorAuth(req2fa) => {
                    Ok(LoginResponse {
                        user: None,
                        requires_2fa: true,
                        type_2fa: Vec::from_iter(req2fa.requires_two_factor_auth.iter().map(|t| format!("{:?}", t))),
                    })
                }
            }
        },
        Err(e) => {
            Err(format!("Login failed: {}", e))
        }
    }
}


//2faverify
#[tauri::command]
#[specta::specta]
pub async fn verify_2fa(
    code: String,
    is_emailotp: bool,
    state: State<'_, VrcApiService>
) -> Result<LoginResponse, String> {
    let config = state.config.lock().await;

    // 1. Verify code based on the type and get the boolean result
    let verified = if is_emailotp {
        verify2_fa_email_code(&config, TwoFactorEmailCode { code }).await
            .map_err(|e| format!("Email 2FA error: {}", e))?
            .verified
    } else {
        verify2_fa(&config, TwoFactorAuthCode { code }).await
            .map_err(|e| format!("App 2FA error: {}", e))?
            .verified
    };

    // 2. Return error if verification failed
    if !verified {
        return Err("2FA verification failed: Incorrect code".to_string());
    }

    // 3. Common success logic: save cookies and fetch user
    if let Err(save_err) = state.save_cookies() {
        eprintln!("Failed to save cookies: {}", save_err);
    }

    match get_current_user(&config).await {
        Ok(user_resp) => {
            if let CurrentUser(user) = user_resp {
                Ok(LoginResponse {
                    user: Some(user.display_name.clone()),
                    requires_2fa: false,
                    type_2fa: Vec::new(),
                })
            } else {
                Err("Verification succeeded, but failed to retrieve user data.".to_string())
            }
        },
        Err(e) => Err(format!("Verification succeeded, but failed to fetch user: {}", e)),
    }
}

// Logout by clearing cookies and optionally calling the API to invalidate the session server-side
#[tauri::command]
#[specta::specta]
pub async fn logout(state: State<'_, VrcApiService>) -> Result<String, String> {
    let config = state.config.lock().await;

    // 1. サーバー側のセッションを破棄 (VRChat APIの /logout を叩く)
    // ※ 既にセッションが切れていたりオフラインだったりしてエラーになることもありますが、
    // ローカルのクッキーを消すのが最優先なので、ここではエラーを無視（let _）します。
    let _ = vrc_logout(&config).await;

    // 2. ローカルのクッキーをクリアしてディスクに反映
    match state.clear_cookies() {
        Ok(_) => Ok("Logged out successfully".to_string()),
        Err(e) => Err(format!("Failed to clear local cookies: {}", e))
    }
}
