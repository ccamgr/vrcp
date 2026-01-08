// types.ts
// 将来的にはopenapi等で自動生成
// 簡易的に手動で定義
/**
 * Rust側の VrcLogEvent に対応する型定義
 * #[serde(tag = "type", content = "data")] の設定に基づき、
 * Discriminated Union (タグ付き共用体) として定義しています。
 */
export type VrcLogEvent =
  | { type: 'AppStart' }
  | { type: 'AppStop' }
  | { type: 'InvalidAppStop' }
  | { type: 'SelfLeft' }
  | {
      type: 'Login';
      data: {
        username: string;
        user_id: string;
      };
    }
  | {
      type: 'WorldEnter';
      data: {
        world_name: string;
      };
    }
  | {
      type: 'InstanceJoin';
      data: {
        world_id: string;
        instance_id: string;
      };
    }
  | {
      type: 'PlayerJoin';
      data: {
        player_name: string;
        user_id: string;
      };
    }
  | {
      type: 'PlayerLeft';
      data: {
        player_name: string;
        user_id: string;
      };
    };

/**
 * Rust側の Payload 構造体に対応
 */
export interface LogPayload {
  event: VrcLogEvent;
  timestamp: string; // "YYYY-MM-DD HH:mm:ss" 形式
  hash: number; // ログの一意なハッシュ値
}

/**
 * GET /logs のレスポンス型 (Payloadの配列)
 */
export type GetLogsResponse = LogPayload[];
