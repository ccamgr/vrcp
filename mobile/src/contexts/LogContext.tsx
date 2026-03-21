import FileWrapper from "@/lib/wrappers/fileWrapper";
import React, { createContext, useContext, useEffect } from "react";

// 定数定義
const LOG_FILE_DIR = FileWrapper.documentDirectory + "logs/";
const LATEST_LOG_FILE = LOG_FILE_DIR + "latest.log";

const MAX_LOG_FILE_SIZE = 10 * 1024; // ファイルサイズ上限: 10KB
const MAX_LOG_FILES = 20;            // 保持する最大ファイル数（latest.log含む）

interface LogContextType {
  log: (message: string, data?: any) => void; // ログファイルに記録
  getRecentLogFilePath: () => string;
  clearLogFiles: () => Promise<void>;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

const useLog = () => {
  const context = useContext(LogContext);
  if (!context) throw new Error("useLog must be used within a LogProvider");
  return context;
};

// 連続書き込みの衝突を防ぐためのキュー（直列化）
let writeQueue = Promise.resolve();

const LogProvider = ({ children }: { children: React.ReactNode }) => {

  // アプリ起動時（マウント時）に logs ディレクトリを確実に作成する
  useEffect(() => {
    const initDir = async () => {
      const dirInfo = await FileWrapper.getInfoAsync(LOG_FILE_DIR);
      if (!dirInfo.exists) {
        await FileWrapper.makeDirectoryAsync(LOG_FILE_DIR, { intermediates: true });
      }
    };
    initDir();
  }, []);

  const writeLogToFile = async (logEntry: string) => {
    let fileInfo = await FileWrapper.getInfoAsync(LATEST_LOG_FILE);
    let existingLogs = "";

    // 1. ファイルが存在する場合の処理（サイズチェックとローテーション）
    if (fileInfo.exists) {
      if (fileInfo.size >= MAX_LOG_FILE_SIZE) {
        // [ローテーション処理]
        // 現在の latest.log を タイムスタンプ付きの名前にリネームして退避
        const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
        const archivedFileName = `log_${timestampStr}.log`;

        await FileWrapper.moveAsync({
          from: LATEST_LOG_FILE,
          to: LOG_FILE_DIR + archivedFileName,
        });

        // [古いファイルの削除処理 (20ファイル上限)]
        const files = await FileWrapper.readDirectoryAsync(LOG_FILE_DIR);
        // latest.log 以外の退避されたログファイルを抽出し、名前順（= 古い順）にソート
        const archivedLogs = files
          .filter(f => f.endsWith(".log") && f !== "latest.log")
          .sort();

        // 保持する最大数（latest.logの1枠分を引く）を超えていたら、古いものから削除
        const maxArchivedFiles = MAX_LOG_FILES - 1;
        if (archivedLogs.length > maxArchivedFiles) {
          const overCount = archivedLogs.length - maxArchivedFiles;
          for (let i = 0; i < overCount; i++) {
            await FileWrapper.deleteAsync(LOG_FILE_DIR + archivedLogs[i], { idempotent: true });
          }
        }

        // リネームしたので、既存ログは空として扱う（新しい latest.log の始まり）
        existingLogs = "";
      } else {
        // 上限に達していなければ、既存のログを読み込む
        existingLogs = await FileWrapper.readAsStringAsync(LATEST_LOG_FILE);
      }
    }

    // 2. 追記して書き込み
    await FileWrapper.writeAsStringAsync(LATEST_LOG_FILE, existingLogs + logEntry);
  };

  const log = (message: string, data?: any) => {
    try {
      const timestamp = new Date().toISOString();

      // データを安全に文字列化
      let dataString = "";
      if (data) {
        try {
          dataString = typeof data === "object" ? JSON.stringify(data) : String(data);
        } catch (e) {
          dataString = "[Unserializable Data]";
        }
      }

      // ログのフォーマット定義
      const logEntry = `[${timestamp}] ${message} ${dataString}\n`;
      console.log(logEntry.trim());

      // writeQueue に繋げることで、複数回呼ばれても順番にファイル処理が行われるようにする
      writeQueue = writeQueue
        .then(() => writeLogToFile(logEntry))
        .catch((error) => console.error("Failed to write log to file:", error));

    } catch (error) {
      console.error("Failed to write log to file:", error);
    }
  };

  const getRecentLogFilePath = () => {
    // 開発者に送る用の最新ファイルパスを返す
    return LATEST_LOG_FILE;
  };

  const clearLogFiles = async () => {
    try {
      const dirInfo = await FileWrapper.getInfoAsync(LOG_FILE_DIR);
      if (!dirInfo.exists) return;

      const files = await FileWrapper.readDirectoryAsync(LOG_FILE_DIR);
      for (const file of files) {
        await FileWrapper.deleteAsync(LOG_FILE_DIR + file, { idempotent: true });
      }
    } catch (error) {
      console.error("Failed to clear log files:", error);
    }
  };

  return (
    <LogContext.Provider value={{ log, getRecentLogFilePath, clearLogFiles }}>
      {children}
    </LogContext.Provider>
  );
};

export { LogProvider, useLog };
