use regex::{Captures, Regex};
use serde::Serialize;
use specta::Type;
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

/// Enum representing specific events detected in VRChat logs.
/// This will be serialized and sent to the frontend.
#[derive(Clone, Serialize, Debug, Type, Event)]
#[serde(tag = "type", content = "data")]
pub enum VrcLogEvent {
    AppStart,
    AppStop,
    Login {
        username: String,
        user_id: String,
    },
    WorldEnter {
        world_name: String,
    },
    InstanceJoin {
        world_id: String,
        instance_id: String,
    },
    PlayerJoin {
        player_name: String,
        user_id: String,
    },
    PlayerLeft {
        player_name: String,
        user_id: String,
    },
    SelfLeft,
}

/// The actual payload structure sent to the frontend via the event system.
#[derive(Clone, Serialize, Type, Event)]
pub struct Payload {
    event: VrcLogEvent,
    timestamp: String,
}

/// Configuration struct defining a regex pattern and a factory function.
/// Used to define log matching rules in a static context.
struct LogDefinition {
    /// The regex pattern string following the timestamp prefix.
    pattern_part: &'static str,
    /// Function to convert regex captures into a VrcLogEvent.
    factory: fn(&Captures) -> VrcLogEvent,
}

/// Static list of log patterns to monitor.
/// Add new log patterns here to extend functionality.
const LOG_DEFINITIONS: &[LogDefinition] = &[
    // 1. Application Start
    LogDefinition {
        pattern_part: r"VRCNP: Server started",
        factory: |_| VrcLogEvent::AppStart,
    },
    // 2. Application Stop
    LogDefinition {
        pattern_part: r"VRCNP: Stopping server",
        factory: |_| VrcLogEvent::AppStop,
    },
    // 3. User Login
    LogDefinition {
        pattern_part: r"User Authenticated: (.+) \((usr_[\w-]+)\)",
        factory: |caps| VrcLogEvent::Login {
            username: caps[2].to_string(),
            user_id: caps[3].to_string(),
        },
    },
    // 4. World Entry
    LogDefinition {
        pattern_part: r"\[Behaviour\] Entering Room: (.+)",
        factory: |caps| VrcLogEvent::WorldEnter {
            world_name: caps[2].to_string(),
        },
    },
    // 5. Instance Join
    LogDefinition {
        pattern_part: r"\[Behaviour\] Joining (wrld_[\w-]+):(.+)",
        factory: |caps| VrcLogEvent::InstanceJoin {
            world_id: caps[2].to_string(),
            instance_id: caps[3].to_string(),
        },
    },
    // 6. Other Player Join
    LogDefinition {
        pattern_part: r"\[Behaviour\] OnPlayerJoined (.+) \((usr_[\w-]+)\)",
        factory: |caps| VrcLogEvent::PlayerJoin {
            player_name: caps[2].to_string(),
            user_id: caps[3].to_string(),
        },
    },
    // 7. Other Player Left
    LogDefinition {
        pattern_part: r"\[Behaviour\] OnPlayerLeft (.+) \((usr_[\w-]+)\)",
        factory: |caps| VrcLogEvent::PlayerLeft {
            player_name: caps[2].to_string(),
            user_id: caps[3].to_string(),
        },
    },
    // 8. Self Left
    LogDefinition {
        pattern_part: r"\[Behaviour\] OnLeftRoom",
        factory: |_| VrcLogEvent::SelfLeft,
    },
];

/// Internal struct holding the compiled Regex object and the factory function.
struct CompiledMatcher {
    regex: Regex,
    factory: fn(&Captures) -> VrcLogEvent,
}

/// Initializes and returns the list of compiled regex matchers.
/// Uses OnceLock to ensure compilation happens only once (lazy initialization).
fn get_compiled_matchers() -> &'static Vec<CompiledMatcher> {
    static CACHE: OnceLock<Vec<CompiledMatcher>> = OnceLock::new();

    CACHE.get_or_init(|| {
        // Common regex pattern for the timestamp prefix (e.g., "2025.12.20 00:00:00")
        let ts_prefix = r"^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}).*";

        LOG_DEFINITIONS
            .iter()
            .map(|def| {
                let full_pattern = format!("{}{}", ts_prefix, def.pattern_part);
                CompiledMatcher {
                    regex: Regex::new(&full_pattern).expect("Regex compile failed"),
                    factory: def.factory,
                }
            })
            .collect()
    })
}

/// Parses a single log line, checks against defined patterns, and emits an event if matched.
/// This function is intended to be called for every line read from the log file.
pub fn process_log_line(line: &str, app: &AppHandle) {
    let line = line.trim();
    if line.is_empty() {
        return;
    }

    // Iterate through cached matchers to find a match
    for matcher in get_compiled_matchers() {
        if let Some(caps) = matcher.regex.captures(line) {
            let event_data = (matcher.factory)(&caps);

            // Extract timestamp (Always in Group 1 based on ts_prefix)
            let timestamp = caps.get(1).map_or("unknown", |m| m.as_str()).to_string();

            let payload = Payload {
                event: event_data,
                timestamp,
            };

            // Emit the event to the frontend safely
            if let Err(e) = Payload::emit(&payload, app) {
                eprintln!("Failed to emit log event: {}", e);
            }
            return;
        }
    }
}
