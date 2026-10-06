use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;
use vrchatapi::apis::authentication_api::{
    get_current_user, logout as vrc_logout, verify2_fa, verify2_fa_email_code,
};
use vrchatapi::apis::Error as ApiError;
use vrchatapi::models::{
    RegisterUserAccount200Response::{CurrentUser, RequiresTwoFactorAuth},
    TwoFactorAuthCode, TwoFactorEmailCode,
};

use crate::Ctx;

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct AuthUser {
    #[serde(rename = "displayName")]
    display_name: String,
    #[serde(rename = "iconUrl")]
    icon_url: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct LoginResponse {
    user: Option<AuthUser>,
    #[serde(rename = "requires2fa")]
    requires_2fa: bool, // 2FAが必要な場合はtrue
    #[serde(rename = "type2fa")]
    type_2fa: Vec<String>, // 2FAの種類（例: "emailOtp", "otp", "totp"）を入れる
}

fn authenticated_response(user: vrchatapi::models::CurrentUser) -> LoginResponse {
    LoginResponse {
        user: Some(AuthUser {
            display_name: user.display_name,
            icon_url: user.icon_url,
        }),
        requires_2fa: false,
        type_2fa: Vec::new(),
    }
}

// Check current login status using saved cookies
#[tauri::command]
#[specta::specta]
pub async fn check_auth(state: State<'_, Ctx>) -> Result<LoginResponse, String> {
    let config = state.vrcapi.config.lock().await;

    // Call API with existing cookies
    match get_current_user(&config).await {
        Ok(response) => {
            match response {
                CurrentUser(user) => {
                    crate::logging::info("auth.check", &[("status", "authenticated")]);
                    Ok(authenticated_response(user))
                }
                RequiresTwoFactorAuth(_) => {
                    crate::logging::info("auth.check", &[("status", "requires_2fa")]);
                    // Session requires 2FA to proceed
                    Err(
                        "Session exists but requires 2FA. Please log in again with 2FA."
                            .to_string(),
                    )
                }
            }
        }
        Err(e) => {
            let status = match &e {
                ApiError::ResponseError(response) if response.status.as_u16() == 401 => {
                    "unauthenticated"
                }
                _ => "failed",
            };
            if status == "unauthenticated" {
                crate::logging::info(
                    "auth.check",
                    &[("status", status), ("error", &e.to_string())],
                );
            } else {
                crate::logging::error(
                    "auth.check",
                    &[("status", status), ("error", &e.to_string())],
                );
            }
            Err(format!("Not logged in or session expired: {}", e))
        }
    }
}
// Login with username and password
#[tauri::command]
#[specta::specta]
pub async fn login(
    username: String,
    password: String,
    state: State<'_, Ctx>,
) -> Result<LoginResponse, String> {
    let mut config = state.vrcapi.config.lock().await;

    // Set Basic Auth credentials
    config.basic_auth = Some((username, Some(password)));

    // Make the request
    let result = get_current_user(&config).await;

    // Clear Basic Auth
    config.basic_auth = None;

    match result {
        Ok(response) => {
            // Save cookies because auth state changed (either success or partial success for 2FA)
            if let Err(save_err) = state.vrcapi.save_cookies() {
                crate::logging::error("credential_store.save", &[("error", &save_err)]);
            }

            match response {
                CurrentUser(user) => {
                    crate::logging::info("auth.login", &[("status", "authenticated")]);
                    Ok(authenticated_response(user))
                }
                RequiresTwoFactorAuth(req2fa) => {
                    crate::logging::info("auth.login", &[("status", "requires_2fa")]);
                    Ok(LoginResponse {
                        user: None,
                        requires_2fa: true,
                        type_2fa: Vec::from_iter(
                            req2fa
                                .requires_two_factor_auth
                                .iter()
                                .map(|t| format!("{:?}", t)),
                        ),
                    })
                }
            }
        }
        Err(e) => {
            let message = e.to_string();
            crate::logging::error("auth.login", &[("status", "failed"), ("error", &message)]);
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
    state: State<'_, Ctx>,
) -> Result<LoginResponse, String> {
    let config = state.vrcapi.config.lock().await;

    // 1. Verify code based on the type and get the boolean result
    let verified = if is_emailotp {
        match verify2_fa_email_code(&config, TwoFactorEmailCode { code }).await {
            Ok(response) => response.verified,
            Err(error) => {
                let message = error.to_string();
                crate::logging::error(
                    "auth.verify_2fa",
                    &[("status", "failed"), ("error", &message)],
                );
                return Err(format!("Email 2FA error: {error}"));
            }
        }
    } else {
        match verify2_fa(&config, TwoFactorAuthCode { code }).await {
            Ok(response) => response.verified,
            Err(error) => {
                let message = error.to_string();
                crate::logging::error(
                    "auth.verify_2fa",
                    &[("status", "failed"), ("error", &message)],
                );
                return Err(format!("App 2FA error: {error}"));
            }
        }
    };

    // 2. Return error if verification failed
    if !verified {
        crate::logging::warn("auth.verify_2fa", &[("status", "rejected")]);
        return Err("2FA verification failed: Incorrect code".to_string());
    }

    // 3. Common success logic: save cookies and fetch user
    if let Err(save_err) = state.vrcapi.save_cookies() {
        crate::logging::error("credential_store.save", &[("error", &save_err)]);
    }

    match get_current_user(&config).await {
        Ok(user_resp) => {
            if let CurrentUser(user) = user_resp {
                crate::logging::info("auth.verify_2fa", &[("status", "authenticated")]);
                Ok(authenticated_response(user))
            } else {
                crate::logging::error(
                    "auth.verify_2fa",
                    &[("status", "failed"), ("error", "current user unavailable")],
                );
                Err("Verification succeeded, but failed to retrieve user data.".to_string())
            }
        }
        Err(e) => {
            let message = e.to_string();
            crate::logging::error(
                "auth.verify_2fa",
                &[("status", "failed"), ("error", &message)],
            );
            Err(format!(
                "Verification succeeded, but failed to fetch user: {}",
                e
            ))
        }
    }
}

// Logout by clearing cookies and optionally calling the API to invalidate the session server-side
#[tauri::command]
#[specta::specta]
pub async fn logout(state: State<'_, Ctx>) -> Result<String, String> {
    let config = state.vrcapi.config.lock().await;

    // 1. サーバー側のセッションを破棄 (VRChat APIの /logout を叩く)
    // ※ 既にセッションが切れていたりオフラインだったりしてエラーになることもありますが、
    // ローカルのクッキーを消すのが最優先なので、ここではエラーを無視（let _）します。
    if let Err(error) = vrc_logout(&config).await {
        crate::logging::warn("auth.logout_api", &[("error", &error.to_string())]);
    }

    // 2. ローカルのクッキーをクリアしてディスクに反映
    match state.vrcapi.clear_cookies() {
        Ok(_) => {
            crate::logging::info("auth.logout", &[("status", "success")]);
            Ok("Logged out successfully".to_string())
        }
        Err(e) => {
            crate::logging::error(
                "auth.logout",
                &[("status", "failed"), ("error", &e.to_string())],
            );
            Err(format!("Failed to clear local cookies: {}", e))
        }
    }
}
