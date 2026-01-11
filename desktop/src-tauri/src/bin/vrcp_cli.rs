use clap::{Parser, Subcommand};
mod subcmds;

// cargo run --bin vrcp_cli -- <SUBCOMMAND>

#[derive(Parser)]
#[command(name = "vrcp_cli")]
#[command(about = "Development tasks for VRCP", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// TypeScriptバインディング生成(only in development mode)
    #[cfg(debug_assertions)]
    GenBindings,
    /// ログファイルをDBにインポート
    ImportLogs {
        #[arg(long, default_value = "cc.amgr.vrcp.desktop.dev")]
        identifier: String, // --identifier=<identifier>
        #[arg(required = true, num_args = 1..)]
        files: Vec<String>,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        #[cfg(debug_assertions)]
        Commands::GenBindings => {
            subcmds::gen_bindings::gen_bindings();
        }

        Commands::ImportLogs { identifier, files } => {
            subcmds::import_logs::import_logs(identifier, files).await;
        }
    }
    Ok(())
}
