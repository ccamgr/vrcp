import { commands, type LogEntry } from './bindings';

export type { LogEntry };

// Tauri環境かどうかの判定
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function greet(name: string): Promise<string> {
  return isTauri ? commands.greet(name) : `Hello, ${name}! (from dev mode)`;
} 


/**
 * 新しいログを取得する関数
 */
export async function fetchNewLogs(): Promise<LogEntry[]> {
  if (isTauri) {
    try {
      const result = await commands.checkLogUpdates();
      console.log("Fetched logs:", result);
      return result.status === "ok" ? result.data : [];
    } catch (error) {
      console.error("Rust invoke error:", error);
      return [];
    }
  } else {
    // === ブラウザでの簡易開発用モック ===
    console.log("[Dev] Fetching mock logs...");
    
    // リアル感を出すために少し待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // ランダムにログがあるフリをする
    if (Math.random() > 0.7) {
      const now = new Date();
      return [
        {
          timestamp: now.toLocaleTimeString(),
          log_type: "Log",
          content: `[Mock] Player joined implementation test at ${now.toISOString()}`,
        }
      ];
    }
    return [];
  }
}