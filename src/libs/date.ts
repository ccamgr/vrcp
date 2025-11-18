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
////

export function getDayOfWeekStr(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

export function isSameDate(date1: Date, date2: Date): boolean {
  const str1 = date1.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit"});
  const str2 = date2.toLocaleDateString([], { year: "numeric", month: "2-digit", day: "2-digit"});
  return str1 === str2;
}

