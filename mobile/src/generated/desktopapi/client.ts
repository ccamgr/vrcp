// client.ts
// 将来的にはopenapi等で自動生成
// 簡易的に手動で定義

import axios from "axios";
import { GetLogsResponse } from "./type";

export function getLogsFromDesktop(apiBaseUrl: string, params: { start?: string; end?: string }) {
  return axios.get<GetLogsResponse>(`${apiBaseUrl}/logs`, { params });
}
