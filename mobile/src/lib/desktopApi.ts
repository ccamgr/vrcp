import axios from "axios";

export interface DesktopSession {
  sourceId: number;
  worldName: string;
  instanceId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  username: string | null;
  players: {
    userId?: string;
    name: string;
    intervals: { start: number; end: number }[];
    totalDurationMs: number;
  }[];
}

export interface DesktopSessionPage {
  schemaVersion?: number;
  sessions: DesktopSession[];
  nextCursor: string | null;
  generation: number;
  source: string;
}

export async function getDesktopSessions(
  apiBaseUrl: string,
  params: { start?: number; end?: number; cursor?: string; limit?: number },
) {
  return axios.get<DesktopSessionPage>(`${apiBaseUrl}/sessions`, {
    params,
    timeout: 15_000,
  });
}
