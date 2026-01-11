use specta_typescript::{BigIntExportBehavior, Typescript};
use vrcp_lib::create_specta_builder;
/**
 * This test generates TypeScript bindings for the Tauri commands and events.
 * Not run in normal test runs, so it's marked with #[ignore].
 *
 * usage: cargo run --bin vrcp_cli -- gen-bindings
 */

pub fn gen_bindings() {
    println!("🚀 Generating bindings...");

    let builder = create_specta_builder();

    builder
        .export(
            Typescript::default()
                .bigint(BigIntExportBehavior::Number) // BigIntをnumberとして扱う
                .formatter(specta_typescript::formatter::prettier)
                .header("// @ts-nocheck\n/* eslint-disable */"),
            "../src/generated/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    println!("✅ Bindings generated at ../src/generated/bindings.ts");
}
