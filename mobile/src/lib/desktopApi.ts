import axios from "axios";

import { LogPayload } from "@/generated/desktopapi/type";

export interface DesktopLogPage {
  logs: LogPayload[];
  nextCursor: string | null;
}

export async function getDesktopLogPage(
  apiBaseUrl: string,
  params: { start?: number; end?: number; cursor?: string; limit?: number },
) {
  return axios.get<DesktopLogPage>(`${apiBaseUrl}/logs`, {
    params,
    timeout: 15_000,
  });
}
