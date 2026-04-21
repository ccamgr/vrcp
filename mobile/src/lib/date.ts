import { format, isSameDay } from "date-fns";

// events
export function getDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
export function restoreDateKey(dateKey: string): Date {
  return new Date(dateKey);
}


/* desktopのi64(unix timestamp からの変換) */

// ゼロ埋め用
const pad = (num: number) => num.toString().padStart(2, "0");
/**
 * HH:mm 形式 (例: 15:30)
 */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/**
 * HH:mm:ss 形式 (例: 15:30:45)
 */
export function formatTimeWithSec(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
/**
 * YYYY-MM-DD 形式 (例: 2026-04-20)
 */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/**
 * MM-DD 形式 (例: 04-20)
 */
export function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/**
 * YYYY-MM-DD HH:mm:ss 形式 (例: 2026-04-20 15:30:45)
 */
export function formatDateTime(ts: number): string {
  return `${formatDate(ts)} ${formatTimeWithSec(ts)}`;
}
/**
 * YYYY-MM-DD HH:mm 形式 (例: 2026-04-20 15:30)
 */
export function formatDateTimeShort(ts: number): string {
  return `${formatDate(ts)} ${formatTime(ts)}`;
}
