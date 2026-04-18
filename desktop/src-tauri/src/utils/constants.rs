pub fn get_user_agent() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    format!("VRCP-Desktop/1.0 ({}; {})", os, arch)
}
