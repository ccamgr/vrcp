import { format, isSameDay } from "date-fns";

// events
export function getDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
export function restoreDateKey(dateKey: string): Date {
  return new Date(dateKey);
}

// timestamp: RFC 3339形式の文字列 (toISOString())
// timestamp文字列やDateオブジェクトを"YYYY/MM/DD HH:MM"形式に変換
export function formatToDateTimeStr(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function formatToDateStr(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
export function formatToTimeStr(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

