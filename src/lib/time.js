import { PEOPLE } from "../data/people";

const formatterCache = new Map();

export function getFormatter(timeZone, options = {}) {
  const key = timeZone + "|" + JSON.stringify(options);
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-GB", { timeZone, ...options });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

export function getLocalTimeZone() {
  return (
    Intl.DateTimeFormat().resolvedOptions().timeZone || PEOPLE.you.homeTimeZone
  );
}

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function minutesFromTime(time) {
  if (time === "24:00") return 1440;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getPartsInTimeZone(date, timeZone) {
  const formatter = getFormatter(timeZone, {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const raw = formatter.formatToParts(date);
  const parts = Object.fromEntries(raw.map((part) => [part.type, part.value]));

  return {
    weekday: parts.weekday.toLowerCase(),
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = getPartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return (asUtc - date.getTime()) / 60000;
}

export function zonedDateTimeToUtc({ year, month, day, hour, minute }, timeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetMinutes(guess, timeZone);
  const utc = new Date(guess.getTime() - offset * 60000);
  const secondOffset = getTimeZoneOffsetMinutes(utc, timeZone);

  if (secondOffset !== offset) {
    return new Date(guess.getTime() - secondOffset * 60000);
  }

  return utc;
}

export function addDaysToDateParts(parts, days) {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0),
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function formatTimeInZone(date, timeZone) {
  return getFormatter(timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatDayInZone(date, timeZone) {
  return getFormatter(timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function prettyTimeZone(timeZone) {
  return timeZone.replaceAll("_", " ");
}

export function formatOffsetLabel(minutes) {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;

  if (mins === 0) return `${sign}${hours} hours`;
  return `${sign}${hours}h ${mins}m`;
}

export function formatDurationUntil(targetDate, now) {
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) return "now";

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `in ${minutes}m`;
  if (minutes === 0) return `in ${hours}h`;
  return `in ${hours}h ${minutes}m`;
}

export function getDateInputValue(date, timeZone) {
  const parts = getPartsInTimeZone(date, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function formatDateTimeForEventList(date, timeZone) {
  return `${formatDayInZone(date, timeZone)} ${formatTimeInZone(date, timeZone)}`;
}
