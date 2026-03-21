
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing';


const isNative = Platform.OS !== 'web';
// if native, use expo-file-system APIs
// if web, use localStorage or IndexedDB (not implemented yet)
class FileWrapper {
  static documentDirectory = isNative ? FileSystem.documentDirectory : "document/";
  static cacheDirectory = isNative ? FileSystem.cacheDirectory : "cache/";

  static async getInfoAsync(localUri: string, options?: FileSystem.InfoOptions | undefined) {
    if (isNative) {
      return FileSystem.getInfoAsync(localUri, options ?? {});
    } else {
      return { exists: false } as FileSystem.FileInfo;
    }
  };
  static async readAsStringAsync(localUri: string, options?: FileSystem.ReadingOptions | undefined) {
    if (isNative) {
      return FileSystem.readAsStringAsync(localUri, options ?? { encoding: FileSystem.EncodingType.UTF8 });
    } else {
      return '';
    }
  };
  static async writeAsStringAsync(localUri: string, content: string, options?: FileSystem.WritingOptions | undefined) {
    if (isNative) {
      return FileSystem.writeAsStringAsync(localUri, content, options ?? { encoding: FileSystem.EncodingType.UTF8 });
    } else {
      return;
    }
  }
  static async deleteAsync(localUri: string, options?: FileSystem.DeletingOptions | undefined) {
    if (isNative) {
      return FileSystem.deleteAsync(localUri, options ?? { idempotent: true });
    } else {
      return;
    }
  }

  static async moveAsync(options: { from: string; to: string }) {
    if (isNative) {
      return FileSystem.moveAsync(options);
    } else {
      return;
    }
  }

  static async makeDirectoryAsync(localUri: string, options?: FileSystem.MakeDirectoryOptions | undefined) {
    if (isNative) {
      return FileSystem.makeDirectoryAsync(localUri, options ?? { intermediates: true });
    } else {
      return;
    }
  }

  static async readDirectoryAsync(localUri: string) {
    if (isNative) {
      return FileSystem.readDirectoryAsync(localUri);
    } else {
      return [];
    }
  }

  static async downloadAsync(remoteUrl: string, localUri: string, options?: FileSystem.DownloadOptions | undefined) {
    if (isNative) {
      return FileSystem.downloadAsync(remoteUrl, localUri, options ?? {});
    } else {
      return { uri: localUri, status: 404, headers: {}, mimeType: "application/octet-stream" } as FileSystem.FileSystemDownloadResult;
    }
  }

  static async copyAsync(options: { from: string; to: string }) {
    if (isNative) {
      return FileSystem.copyAsync(options);
    } else {
      return;
    }
  }
}

export default FileWrapper;



/**
 * Share a file via the system's sharing capabilities.
 * @param fileUrl local file uri or remote url
 * @param fileName optional, if provided, the file will be saved/copied with this name
 * @returns
 */
// export async function shareFile(fileUrl: string, fileName?: string) {
//   if (!isNative) return;
//   // Sharingが利用可能かチェック
//   if (!(await Sharing.isAvailableAsync())) {
//     Alert.alert('エラー', 'お使いのデバイスでは共有機能が利用できません。');
//     return;
//   }
//   const isLocalUri = fileUrl.startsWith('file://');
//   const initialFileName = fileUrl.split('/').pop() || 'downloaded_file';
//   try {
//     let uri = "";
//     if (!isLocalUri) {
//       // ファイルをキャッシュディレクトリにダウンロード
//       const fName = fileName || initialFileName;
//       const fileUri = FileSystem.cacheDirectory + fName;
//       console.log('Downloading file to:', fileUri);
//       const result = await FileSystem.downloadAsync(fileUrl, fileUri);
//       console.log('File downloaded to:', result.uri);
//       uri = result.uri;
//     } else {
//       if (!fileName) {
//         uri = fileUrl;
//       } else {
//         // ローカルファイルを指定された名前でコピー
//         const destUri = FileSystem.cacheDirectory + fileName;
//         await FileSystem.copyAsync({ from: fileUrl, to: destUri });
//         uri = destUri;
//       }
//     }

//     // get mime type
//     const ext = uri.split('.').pop()?.toLowerCase();
//     const mimeType = getMimeType(ext)

//     // 共有シートを開く
//     await Sharing.shareAsync(uri, {
//       dialogTitle: 'ファイルを保存または共有',
//       mimeType,
//     });

//   } catch (error) {
//     console.error('ファイルの共有に失敗しました:', error);
//     Alert.alert('エラー', 'ファイルの共有に失敗しました。');
//   }
// };

const getMimeType = (ext: string | undefined): string => {
  switch (ext) {
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'zip':
      return 'application/zip';
    case 'mp3':
      return 'audio/mpeg';
    case 'mp4':
      return 'video/mp4';
    // -----
    default:
      return 'application/octet-stream';
  }
}
