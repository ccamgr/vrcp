import FileWrapper from "@/lib/wrappers/fileWrapper";

const LOG_FILE_DIR = FileWrapper.documentDirectory + "logs/";
const LATEST_LOG_FILE = LOG_FILE_DIR + "latest.log";

const MAX_LOG_FILE_SIZE = 10 * 1024; // 10KB
const MAX_LOG_FILES = 20;

let isWriting = false;
let isInitialized = false;
const writeQueue: string[] = [];

export const initDir = async () => {
  if (isInitialized) return;
  const dirInfo = await FileWrapper.getInfoAsync(LOG_FILE_DIR);
  if (!dirInfo.exists) {
    await FileWrapper.makeDirectoryAsync(LOG_FILE_DIR, { intermediates: true });
  }
  isInitialized = true;
};

const processQueue = async () => {
  if (isWriting || writeQueue.length === 0) return;
  isWriting = true;

  await initDir();

  while (writeQueue.length > 0) {
    const logEntry = writeQueue.shift();
    if (logEntry) {
      await writeLogToFile(logEntry);
    }
  }

  isWriting = false;
};

const writeLogToFile = async (logEntry: string) => {
  try {
    let fileInfo = await FileWrapper.getInfoAsync(LATEST_LOG_FILE);
    let existingLogs = "";

    if (fileInfo.exists) {
      if (fileInfo.size >= MAX_LOG_FILE_SIZE) {
        // Rotation process
        const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
        const archivedFileName = `log_${timestampStr}.log`;

        await FileWrapper.moveAsync({
          from: LATEST_LOG_FILE,
          to: LOG_FILE_DIR + archivedFileName,
        });

        // Cleanup old files
        const files = await FileWrapper.readDirectoryAsync(LOG_FILE_DIR);
        const archivedLogs = files
          .filter((f) => f.endsWith(".log") && f !== "latest.log")
          .sort();

        const maxArchivedFiles = MAX_LOG_FILES - 1;
        if (archivedLogs.length > maxArchivedFiles) {
          const overCount = archivedLogs.length - maxArchivedFiles;
          for (let i = 0; i < overCount; i++) {
            await FileWrapper.deleteAsync(LOG_FILE_DIR + archivedLogs[i], { idempotent: true });
          }
        }
        existingLogs = "";
      } else {
        existingLogs = await FileWrapper.readAsStringAsync(LATEST_LOG_FILE);
      }
    }

    await FileWrapper.writeAsStringAsync(LATEST_LOG_FILE, existingLogs + logEntry);
  } catch (e) {
    console.error("Failed to write to log file:", e);
  }
};

/**
 * シンプルなロガー機能を提供するユーティリティ
 */
export const logger = {
  log: (message: string, data?: any) => {
    try {
      const timestamp = new Date().toISOString();
      let dataString = "";
      if (data) {
        try {
          dataString = typeof data === "object" ? JSON.stringify(data) : String(data);
        } catch (e) {
          dataString = "[Unserializable Data]";
        }
      }

      const logEntry = `[${timestamp}] ${message} ${dataString}\n`;
      console.log(logEntry.trim());

      writeQueue.push(logEntry);
      processQueue();
    } catch (error) {
      console.error("Failed to enqueue log:", error);
    }
  },
  getRecentLogFilePath: () => LATEST_LOG_FILE,
  clearLogFiles: async () => {
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
  }
};
