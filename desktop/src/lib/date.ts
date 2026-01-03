
/**
 *
 * @param date
 * @returns YYYY-MM-DDThh:mm:ss+09:00 (ローカルタイムゾーン)形式のISO文字列
 */
export function getLocalISODate(date: Date): string {
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  const timezoneOffset = -date.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const absOffset = Math.abs(timezoneOffset);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const offsetMinutes = String(absOffset % 60).padStart(2, '0');
  return `${Y}-${M}-${D}T${h}:${m}:${s}${sign}${offsetHours}:${offsetMinutes}`;
}
