const DEFAULT_TIMEZONE = "Asia/Shanghai";

/** SQLite CURRENT_TIMESTAMP 为 UTC，格式 "YYYY-MM-DD HH:MM:SS"（无时区后缀） */
export function parseDbDateTime(dateStr: string): Date {
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed.replace(" ", "T")}Z`);
  }
  return new Date(trimmed);
}

export function getServerDateTimeContext(timezone = DEFAULT_TIMEZONE): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}年${get("month")}${get("day")}日 ${get("weekday")} ${get("hour")}:${get("minute")}:${get("second")}（${timezone}）`;
}

export function isDateTimeQuery(query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  return /(?:今天|今(?:日|天)|几号|几月|星期|周几|礼拜|什么日子|现在.*(?:时间|几点)|当前.*(?:日期|时间)|日期|几点了|what(?:'s| is)? (?:the )?date|today|what day)/i.test(q);
}
