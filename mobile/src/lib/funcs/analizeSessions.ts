import { LogPayload } from "@/generated/desktopapi/type";

export interface PlayerInterval {
  name: string;
  intervals: { start: number; end: number }[]; // 1回の滞在で複数回出入りする可能性に対応
  totalDurationMs: number;
}

export interface WorldSession {
  worldName: string;
  instanceId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  username: string | null;
  players: PlayerInterval[];
}

/**
 * ログ配列を解析し、ワールド滞在ごとのセッション情報に変換する
 */
export function analyzeSessions(logs: LogPayload[]): WorldSession[] {
  const sessions: WorldSession[] = [];

  let me: {
    userId: string;
    name: string;
  } | null = null;

  let currentSession: Partial<WorldSession> | null = null;
  // 一時的に保持するワールド名
  let worldName: string | null = null;
  // 一時的にプレイヤーの入室時間を記録するマップ (id -> timestamp)
  let activePlayers = new Map<string, { name: string; start: number }>();
  // 完了したプレイヤーの区間記録 (id -> [{name, start, end }, ...])
  let playerIntervals = new Map<string, { name: string; start: number; end: number }[]>();

  // ヘルパー: 日付文字列をタイムスタンプに変換 (ハイフン区切り対応)
  const toTime = (ts: string) => new Date(ts.replace(' ', 'T')).getTime();

  // 現在のセッションを確定させてリストに追加する関数
  const closeSession = (endTime: number) => {
    if (!currentSession || !currentSession.startTime) return;
    currentSession.endTime = endTime;

    // まだ退出していないプレイヤーがいれば強制的に退出扱いにする
    activePlayers.forEach(({ name, start }, id) => {
      const intervals = playerIntervals.get(id) || [];
      intervals.push({ name, start, end: endTime });
      playerIntervals.set(id, intervals);
    });

    // プレイヤーデータを整形
    const players: PlayerInterval[] = [];
    playerIntervals.forEach((intervals, id) => {

      // 合計時間を計算
      const total = intervals.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
      const playerData: PlayerInterval = {
        name: intervals[0]?.name || "Unknown",
        intervals,
        totalDurationMs: total
      };
      if (me && id === me.userId) {
        currentSession!.startTime = intervals[0].start;  // 自分の最初の入室時間をセッション開始時間にする
        currentSession!.endTime = intervals[0].end; // 自分の最後の退出時間をセッション終了時間にする
      } else {
        players.push(playerData);
      }
    });


    sessions.push({
      worldName: currentSession.worldName || "Unknown World",
      instanceId: currentSession.instanceId || "",
      startTime: currentSession.startTime,
      endTime: currentSession.endTime,
      durationMs: currentSession.endTime - currentSession.startTime,
      username: me ? me.name : null,
      players: players.sort((a, b) => b.totalDurationMs - a.totalDurationMs), // 長くいた順
    });

    // リセット
    currentSession = null;
    activePlayers.clear();
    playerIntervals.clear();
  };
  console.log("Analyzing logs:", logs.map(l => `[${l.timestamp}] ${JSON.stringify(l.event.type)}  `));
  logs.forEach((log) => {
    const ts = toTime(log.timestamp);
    // @ts-ignore
    const { type, data } = log.event;

    if (type === "Login") {
      // ログインイベントから自分のユーザーIDを取得する
      me = {
        userId: data.user_id,
        name: data.username,
      };
    }

    // 1. ワールドに参加 (セッション開始)
    else if (type === "WorldEnter") {
      worldName = data.world_name || "Unknown World";
    }
    else if (type === "InstanceJoin") {
      if (currentSession) closeSession(ts)
      currentSession = {
        worldName: worldName || "Unknown World", // 直前のWorldEnterで設定されたワールド名を引き継ぐ
        instanceId: data.instance_id || "",
        startTime: ts,
      };
      worldName = null; // ワールド名は使い切ったのでリセット
    }
    // 2. 誰かが入ってきた
    else if (type === "PlayerJoin" && currentSession) {
      const name = data.player_name;
      activePlayers.set(data.user_id, { name, start: ts });
    }
    // 3. 誰かが抜けた
    else if (type === "PlayerLeft" && currentSession) {
      const user = activePlayers.get(data.user_id);
      if (user) {
        // 区間を記録
        const intervals = playerIntervals.get(data.user_id) || [];
        intervals.push({ name: user.name, start: user.start, end: ts });
        playerIntervals.set(data.user_id, intervals);
        activePlayers.delete(data.user_id);
      }
    }
    // 4. アプリ終了など (セッション終了)
    else if ((type === "AppStop" || type === "InvalidAppStop") && currentSession) {
      closeSession(ts);
    }
  });

  // ループ終了時にまだセッションが続いている
  // (rust側でInvalidAppStopを挿入しているので, "セッションが続く" = VRC起動中 となる)の場合、
  // 現在時刻(または最後のログ時刻)で閉じる
  if (currentSession) {
    closeSession(Date.now());
  }

  // 新しい順に並び替え
  return sessions.reverse();
}
