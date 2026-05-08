import { useEffect, useMemo, useRef, useState, memo } from "react";
import {
  CalendarDays,
  Clock,
  Heart,
  MapPin,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";

// Together Time
// Mobile-first relationship timezone planner.
// The timeline is now a continuous, scrollable stream of time.
// Events can cross midnight, e.g. Sleep: Monday 22:30 → Tuesday 07:30.
// The main timeline always uses the device/browser timezone.
// Each person's timetable stays anchored to their home timezone.

const Card = memo(function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
});

const CardContent = memo(function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
});

const formatterCache = new Map();

function getFormatter(timeZone, options = {}) {
  const key = timeZone + "|" + JSON.stringify(options);
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-GB", { timeZone, ...options });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

const PEOPLE = {
  you: {
    name: "Jake",
    homeTimeZone: "Europe/London",
    emoji: "🇬🇧",
  },
  partner: {
    name: "Amy",
    homeTimeZone: "Australia/Brisbane",
    emoji: "🇦🇺",
  },
};

const EVERY_DAY = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const SCHOOL_NIGHTS = ["sunday", "monday", "tuesday", "wednesday", "thursday"];
const WEEKEND_NIGHTS = ["friday", "saturday"];

// Status types:
// sleep = asleep
// busy  = unavailable
// maybe = possible but not ideal
// free  = good for calls
//
// Each item is a recurring event.
// days = the day the event STARTS in that person's home timezone.
// If end is earlier than start, the event automatically flows into the next day.
// Example: start "22:30", end "07:30" means 22:30 today → 07:30 tomorrow.
const WEEKLY_SCHEDULES = {
  you: [
    {
      days: SCHOOL_NIGHTS,
      start: "23:00",
      end: "07:30",
      type: "sleep",
      label: "Sleep",
    },
    {
      days: WEEKEND_NIGHTS,
      start: "00:00",
      end: "09:00",
      type: "sleep",
      label: "Sleep",
    },
    {
      days: WEEKDAYS,
      start: "07:30",
      end: "09:00",
      type: "free",
      label: "Free",
    },
    {
      days: WEEKDAYS,
      start: "09:00",
      end: "15:00",
      type: "busy",
      label: "Uni / study",
    },
    {
      days: WEEKDAYS,
      start: "19:00",
      end: "22:00",
      type: "free",
      label: "Free",
    },
    {
      days: WEEKDAYS,
      start: "22:00",
      end: "23:00",
      type: "free",
      label: "CALL AMY",
    },
    {
      days: ["saturday"],
      start: "12:00",
      end: "22:30",
      type: "free",
      label: "Free",
    },
    {
      days: ["sunday"],
      start: "13:00",
      end: "21:30",
      type: "free",
      label: "Free",
    },
    // {
    //   days: EVERY_DAY,
    //   start: "21:30",
    //   end: "22:30",
    //   type: "maybe",
    //   label: "Wind down",
    // },
  ],
  partner: [
    {
      days: SCHOOL_NIGHTS,
      start: "22:00",
      end: "07:00",
      type: "sleep",
      label: "Sleep",
    },
    {
      days: WEEKEND_NIGHTS,
      start: "21:30",
      end: "08:30",
      type: "sleep",
      label: "Sleep",
    },
    {
      days: WEEKDAYS,
      start: "09:00",
      end: "14:00",
      type: "busy",
      label: "Class / study",
    },
    {
      days: WEEKDAYS,
      start: "17:30",
      end: "22:00",
      type: "free",
      label: "Free",
    },
    {
      days: ["saturday", "sunday"],
      start: "12:00",
      end: "21:30",
      type: "free",
      label: "Free",
    },
    // {
    //   days: EVERY_DAY,
    //   start: "21:30",
    //   end: "22:00",
    //   type: "maybe",
    //   label: "Wind down",
    // },
  ],
};

const STATUS_STYLES = {
  sleep: "bg-slate-900 text-white border-slate-800",
  busy: "bg-rose-100 text-rose-950 border-rose-200",
  maybe: "bg-amber-100 text-amber-950 border-amber-200",
  free: "bg-emerald-100 text-emerald-950 border-emerald-200",
  call: "bg-pink-100 text-pink-950 border-pink-200 ring-2 ring-pink-300",
  unknown: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_LABELS = {
  sleep: "Sleeping",
  busy: "Busy",
  maybe: "Maybe",
  free: "Free",
  call: "Best call",
  unknown: "Unknown",
};

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const HOUR_HEIGHT = 72;
const TIMELINE_DAYS_BEFORE_TODAY = 1;
const TIMELINE_DAYS_AFTER_TODAY = 3;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function getLocalTimeZone() {
  return (
    Intl.DateTimeFormat().resolvedOptions().timeZone || PEOPLE.you.homeTimeZone
  );
}

// removed unused `pad` helper to satisfy linting

function minutesFromTime(time) {
  if (time === "24:00") return 1440;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getPartsInTimeZone(date, timeZone) {
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

function getTimeZoneOffsetMinutes(date, timeZone) {
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

function zonedDateTimeToUtc({ year, month, day, hour, minute }, timeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetMinutes(guess, timeZone);
  const utc = new Date(guess.getTime() - offset * 60000);
  const secondOffset = getTimeZoneOffsetMinutes(utc, timeZone);

  if (secondOffset !== offset) {
    return new Date(guess.getTime() - secondOffset * 60000);
  }

  return utc;
}

function addDaysToDateParts(parts, days) {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0),
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getDayKeyFromDateParts(parts) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  return DAY_KEYS[date.getUTCDay()];
}

function recurringEventToUtcInterval(personKey, event, startDateParts) {
  const person = PEOPLE[personKey];
  const startMinutes = minutesFromTime(event.start);
  const endMinutes = minutesFromTime(event.end);
  const endsNextDay = endMinutes <= startMinutes;

  const endDateParts = addDaysToDateParts(startDateParts, endsNextDay ? 1 : 0);

  const startUtc = zonedDateTimeToUtc(
    {
      ...startDateParts,
      hour: Math.floor(startMinutes / 60),
      minute: startMinutes % 60,
    },
    person.homeTimeZone,
  );

  const endUtc = zonedDateTimeToUtc(
    {
      ...endDateParts,
      hour: Math.floor(endMinutes / 60),
      minute: endMinutes % 60,
    },
    person.homeTimeZone,
  );

  return { ...event, startUtc, endUtc };
}

function getTimelineBounds(now, viewerTimeZone) {
  const viewerParts = getPartsInTimeZone(now, viewerTimeZone);
  const startParts = addDaysToDateParts(
    viewerParts,
    -TIMELINE_DAYS_BEFORE_TODAY,
  );
  const endParts = addDaysToDateParts(
    viewerParts,
    TIMELINE_DAYS_AFTER_TODAY + 1,
  );

  const startUtc = zonedDateTimeToUtc(
    { ...startParts, hour: 0, minute: 0 },
    viewerTimeZone,
  );
  const endUtc = zonedDateTimeToUtc(
    { ...endParts, hour: 0, minute: 0 },
    viewerTimeZone,
  );

  const totalHours = (endUtc.getTime() - startUtc.getTime()) / MS_PER_HOUR;
  const totalHeight = totalHours * HOUR_HEIGHT;

  return { startUtc, endUtc, totalHours, totalHeight };
}

function generateScheduleIntervals(personKey, rangeStartUtc, rangeEndUtc) {
  const personTimeZone = PEOPLE[personKey].homeTimeZone;
  const startParts = getPartsInTimeZone(rangeStartUtc, personTimeZone);
  const totalDays =
    Math.ceil((rangeEndUtc.getTime() - rangeStartUtc.getTime()) / MS_PER_DAY) +
    4;
  const intervals = [];

  for (let dayOffset = -2; dayOffset <= totalDays; dayOffset += 1) {
    const dateParts = addDaysToDateParts(startParts, dayOffset);
    const dayKey = getDayKeyFromDateParts(dateParts);

    WEEKLY_SCHEDULES[personKey].forEach((event) => {
      if (!event.days.includes(dayKey)) return;

      const interval = recurringEventToUtcInterval(personKey, event, dateParts);
      if (interval.endUtc > rangeStartUtc && interval.startUtc < rangeEndUtc) {
        intervals.push(interval);
      }
    });
  }

  return intervals.sort((a, b) => a.startUtc - b.startUtc);
}

function buildVisibleBlocks(
  personKey,
  rangeStartUtc,
  rangeEndUtc,
  totalHeight,
) {
  const intervals = generateScheduleIntervals(
    personKey,
    rangeStartUtc,
    rangeEndUtc,
  );
  const rangeDuration = rangeEndUtc.getTime() - rangeStartUtc.getTime();

  return intervals.map((interval) => {
    const clippedStart = Math.max(
      interval.startUtc.getTime(),
      rangeStartUtc.getTime(),
    );
    const clippedEnd = Math.min(
      interval.endUtc.getTime(),
      rangeEndUtc.getTime(),
    );
    const top =
      ((clippedStart - rangeStartUtc.getTime()) / rangeDuration) * totalHeight;
    const height = ((clippedEnd - clippedStart) / rangeDuration) * totalHeight;

    return {
      ...interval,
      top,
      height,
      startUtc: new Date(clippedStart),
      endUtc: new Date(clippedEnd),
    };
  });
}

function getStatusAt(personKey, date) {
  const rangeStartUtc = new Date(date.getTime() - MS_PER_DAY * 2);
  const rangeEndUtc = new Date(date.getTime() + MS_PER_DAY * 2);
  const event = generateScheduleIntervals(
    personKey,
    rangeStartUtc,
    rangeEndUtc,
  ).find((item) => item.startUtc <= date && item.endUtc > date);

  return event || { type: "unknown", label: "Unknown" };
}

function findOverlapWindows(rangeStartUtc, rangeEndUtc, now) {
  const stepMs = 15 * 60 * 1000;
  const windows = [];
  let current = null;
  const start = Math.max(rangeStartUtc.getTime(), now.getTime() - stepMs);

  for (let t = start; t < rangeEndUtc.getTime(); t += stepMs) {
    const date = new Date(t);
    const you = getStatusAt("you", date);
    const partner = getStatusAt("partner", date);
    const isGood =
      ["free", "maybe"].includes(you.type) &&
      ["free", "maybe"].includes(partner.type);
    const isBest = you.type === "free" && partner.type === "free";

    if (isGood) {
      if (!current) {
        current = { start: t, end: t + stepMs, best: isBest };
      } else {
        current.end = t + stepMs;
        current.best = current.best || isBest;
      }
    } else if (current) {
      if (current.end - current.start >= 30 * 60 * 1000) windows.push(current);
      current = null;
    }
  }

  if (current && current.end - current.start >= 30 * 60 * 1000) {
    windows.push(current);
  }

  return windows.map((window) => ({
    ...window,
    startDate: new Date(window.start),
    endDate: new Date(window.end),
  }));
}

function formatTimeInZone(date, timeZone) {
  return getFormatter(timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatDayInZone(date, timeZone) {
  return getFormatter(timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function prettyTimeZone(timeZone) {
  return timeZone.replaceAll("_", " ");
}

function formatOffsetLabel(minutes) {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;

  if (mins === 0) return `${sign}${hours} hours`;
  return `${sign}${hours}h ${mins}m`;
}

function formatDurationUntil(targetDate, now) {
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) return "now";

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `in ${minutes}m`;
  if (minutes === 0) return `in ${hours}h`;
  return `in ${hours}h ${minutes}m`;
}

function TimelineBlock({ block }) {
  const minHeight = Math.max(block.height, 26);
  const styleClass = STATUS_STYLES[block.type] || STATUS_STYLES.unknown;
  const showStatusLine =
    minHeight > 42 && STATUS_LABELS[block.type] !== block.label;

  return (
    <div
      className={`absolute left-1 right-1 overflow-hidden rounded-xl border px-2 py-1 text-[11px] leading-tight shadow-sm ${styleClass} ${
        block.type === "sleep" ? "isolate" : ""
      }`}
      style={{ top: block.top, height: minHeight }}
      title={`${block.label}: ${block.start}–${block.end}`}
    >
      {block.type === "sleep" && (
        <div className="sleep-sky-overlay" aria-hidden="true" />
      )}
      <div className="relative z-10 truncate font-semibold">{block.label}</div>
      {showStatusLine && (
        <div className="relative z-10 truncate opacity-75">
          {STATUS_LABELS[block.type]}
        </div>
      )}
    </div>
  );
}

const MemoTimelineBlock = memo(TimelineBlock);

function PersonStatus({ personKey, status, time, viewer }) {
  const person = PEOPLE[personKey];
  const styleClass = STATUS_STYLES[status.type] || STATUS_STYLES.unknown;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <span>{person.emoji}</span>
          <span>{person.name}</span>
          {viewer === personKey && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
              me
            </span>
          )}
        </div>
        <div className="text-2xl font-bold tracking-tight">{time}</div>
      </div>
      <div
        className={`rounded-2xl border px-3 py-2 text-right text-xs font-semibold ${styleClass}`}
      >
        {status.label}
      </div>
    </div>
  );
}

const MemoPersonStatus = memo(PersonStatus);

function CombinedPersonStatus({
  you,
  youTime,
  partner,
  partnerTime,
  viewer,
  timeDifferenceLabel,
}) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          <MemoPersonStatus
            personKey="you"
            status={you}
            time={youTime}
            viewer={viewer}
          />

          <div className="relative -mx-4 flex items-center gap-2">
            <div className="flex-1 border-t border-slate-100" />
            <div className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-0.5 text-xs font-medium tracking-wide text-slate-500">
              {timeDifferenceLabel}
            </div>
            <div className="flex-1 border-t border-slate-100" />
          </div>

          <MemoPersonStatus
            personKey="partner"
            status={partner}
            time={partnerTime}
            viewer={viewer}
          />
        </div>
      </CardContent>
    </Card>
  );
}

const MemoCombinedPersonStatus = memo(CombinedPersonStatus);

function OverlapCard({ window, viewerTimeZone, now, isFirst }) {
  const youTimeZone = PEOPLE.you.homeTimeZone;
  const partnerTimeZone = PEOPLE.partner.homeTimeZone;
  const startsInLabel = formatDurationUntil(window.startDate, now);

  return (
    <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm font-bold text-slate-950">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          {window.best ? "Best call window" : "Possible call window"}
        </div>

        {isFirst && (
          <div className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-700">
            {startsInLabel}
          </div>
        )}
      </div>
      <div className="text-2xl font-black tracking-tight text-slate-950">
        {formatTimeInZone(window.startDate, viewerTimeZone)}–
        {formatTimeInZone(window.endDate, viewerTimeZone)}
      </div>
      <div className="mt-1 text-sm text-slate-500">
        {formatDayInZone(window.startDate, viewerTimeZone)} in this device's
        local time
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="font-semibold text-slate-500">UK time</div>
          <div className="font-bold text-slate-950">
            {formatTimeInZone(window.startDate, youTimeZone)}–
            {formatTimeInZone(window.endDate, youTimeZone)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="font-semibold text-slate-500">Brisbane time</div>
          <div className="font-bold text-slate-950">
            {formatTimeInZone(window.startDate, partnerTimeZone)}–
            {formatTimeInZone(window.endDate, partnerTimeZone)}
          </div>
        </div>
      </div>
    </div>
  );
}

const MemoOverlapCard = memo(OverlapCard);

function buildHourMarkers(rangeStartUtc, totalHours) {
  return Array.from({ length: Math.floor(totalHours) + 1 }).map((_, index) => ({
    index,
    date: new Date(rangeStartUtc.getTime() + index * MS_PER_HOUR),
    top: index * HOUR_HEIGHT,
  }));
}

function buildDayDividers(
  rangeStartUtc,
  rangeEndUtc,
  viewerTimeZone,
  otherTimeZone,
  totalHeight,
) {
  const entries = [];
  const rangeDuration = rangeEndUtc.getTime() - rangeStartUtc.getTime();

  // viewer midnights
  const viewerStartParts = getPartsInTimeZone(rangeStartUtc, viewerTimeZone);
  const totalDays = Math.ceil(rangeDuration / MS_PER_DAY) + 1;
  for (let dayOffset = 0; dayOffset <= totalDays; dayOffset += 1) {
    const dateParts = addDaysToDateParts(viewerStartParts, dayOffset);
    const midnightUtc = zonedDateTimeToUtc(
      { ...dateParts, hour: 0, minute: 0 },
      viewerTimeZone,
    );
    if (midnightUtc < rangeStartUtc || midnightUtc > rangeEndUtc) continue;

    const top =
      ((midnightUtc.getTime() - rangeStartUtc.getTime()) / rangeDuration) *
      totalHeight;

    entries.push({
      top,
      date: midnightUtc,
      label: formatDayInZone(midnightUtc, viewerTimeZone),
      owner: "you",
    });
  }

  // other person's midnights
  const otherStartParts = getPartsInTimeZone(rangeStartUtc, otherTimeZone);
  for (let dayOffset = 0; dayOffset <= totalDays; dayOffset += 1) {
    const dateParts = addDaysToDateParts(otherStartParts, dayOffset);
    const midnightUtc = zonedDateTimeToUtc(
      { ...dateParts, hour: 0, minute: 0 },
      otherTimeZone,
    );
    if (midnightUtc < rangeStartUtc || midnightUtc > rangeEndUtc) continue;

    const top =
      ((midnightUtc.getTime() - rangeStartUtc.getTime()) / rangeDuration) *
      totalHeight;

    entries.push({
      top,
      date: midnightUtc,
      label: formatDayInZone(midnightUtc, otherTimeZone),
      owner: "her",
    });
  }

  // sort by UTC time so rendering order is vertical
  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export default function TogetherTimeApp() {
  const [localTimeZone, setLocalTimeZone] = useState(getLocalTimeZone);
  const [now, setNow] = useState(() => new Date());
  const timelineScrollRef = useRef(null);

  const viewerFromUrl = new URLSearchParams(window.location.search)
    .get("me")
    ?.toLowerCase();

  const viewer = viewerFromUrl === "amy" ? "partner" : "you";
  const viewerName = viewer === "partner" ? "Amy" : "Jake";
  const viewerTimeZone = localTimeZone;
  const otherPersonKey = viewer === "you" ? "partner" : "you";
  const otherTimeZone = PEOPLE[otherPersonKey].homeTimeZone;
  const otherTimeLabel = viewer === "you" ? "Her time" : "Your time";

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());

      const latestTimeZone = getLocalTimeZone();
      setLocalTimeZone((currentTimeZone) =>
        currentTimeZone === latestTimeZone ? currentTimeZone : latestTimeZone,
      );
    }, 30 * 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timeline = useMemo(
    () => getTimelineBounds(now, viewerTimeZone),
    [now, viewerTimeZone],
  );

  const youBlocks = useMemo(
    () =>
      buildVisibleBlocks(
        "you",
        timeline.startUtc,
        timeline.endUtc,
        timeline.totalHeight,
      ),
    [timeline.startUtc, timeline.endUtc, timeline.totalHeight],
  );
  const partnerBlocks = useMemo(
    () =>
      buildVisibleBlocks(
        "partner",
        timeline.startUtc,
        timeline.endUtc,
        timeline.totalHeight,
      ),
    [timeline.startUtc, timeline.endUtc, timeline.totalHeight],
  );
  const overlapWindows = useMemo(
    () => findOverlapWindows(timeline.startUtc, timeline.endUtc, now),
    [timeline.startUtc, timeline.endUtc, now],
  );
  const nextWindows = overlapWindows
    .filter((window) => window.endDate.getTime() >= now.getTime())
    .slice(0, 3);

  const currentYou = useMemo(() => getStatusAt("you", now), [now]);
  const currentPartner = useMemo(() => getStatusAt("partner", now), [now]);
  const baseDifferenceMinutes =
    getTimeZoneOffsetMinutes(now, PEOPLE.partner.homeTimeZone) -
    getTimeZoneOffsetMinutes(now, PEOPLE.you.homeTimeZone);
  const viewerRelativeDifferenceMinutes =
    viewer === "you" ? baseDifferenceMinutes : -baseDifferenceMinutes;
  const timeDifferenceLabel = formatOffsetLabel(
    viewerRelativeDifferenceMinutes,
  );

  const nowTop = Math.max(
    0,
    Math.min(
      timeline.totalHeight,
      ((now.getTime() - timeline.startUtc.getTime()) /
        (timeline.endUtc.getTime() - timeline.startUtc.getTime())) *
        timeline.totalHeight,
    ),
  );

  const hourMarkers = useMemo(
    () => buildHourMarkers(timeline.startUtc, timeline.totalHours),
    [timeline.startUtc, timeline.totalHours],
  );
  const dayDividers = useMemo(
    () =>
      buildDayDividers(
        timeline.startUtc,
        timeline.endUtc,
        viewerTimeZone,
        otherTimeZone,
        timeline.totalHeight,
      ),
    [
      timeline.startUtc,
      timeline.endUtc,
      viewerTimeZone,
      otherTimeZone,
      timeline.totalHeight,
    ],
  );

  useEffect(() => {
    const scrollEl = timelineScrollRef.current;
    if (!scrollEl) return;

    const desiredTop = Math.max(0, nowTop - scrollEl.clientHeight * 0.38);
    scrollEl.scrollTop = desiredTop;
  }, [viewerTimeZone, nowTop]);

  return (
    <main className="min-h-screen bg-linear-to-b from-pink-50 via-white to-slate-100 px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-md space-y-5">
        <header className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-pink-700">
                <Heart className="h-4 w-4 fill-pink-200" />
                Together Time
              </div>

              <h1 className="mt-1 text-3xl font-black tracking-tight">
                When can we talk?
              </h1>

              <div className="mt-1 text-xs text-slate-500">
                Viewing as {viewerName}
              </div>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 text-right text-xs font-semibold text-slate-500 shadow-sm">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Device time
              </div>
              <div className="text-slate-950">
                {prettyTimeZone(localTimeZone)}
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3">
          <MemoCombinedPersonStatus
            you={currentYou}
            youTime={formatTimeInZone(now, PEOPLE.you.homeTimeZone)}
            partner={currentPartner}
            partnerTime={formatTimeInZone(now, PEOPLE.partner.homeTimeZone)}
            viewer={viewer}
            timeDifferenceLabel={timeDifferenceLabel}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-sm font-bold text-slate-700">
            <CalendarDays className="h-4 w-4" /> Next good windows
          </div>
          {nextWindows.length > 0 ? (
            nextWindows.map((window, index) => (
              <MemoOverlapCard
                key={window.start}
                window={window}
                viewerTimeZone={viewerTimeZone}
                now={now}
                isFirst={index === 0}
              />
            ))
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-4 text-sm text-slate-600">
                No good call windows in the visible timeline. Adjust the
                timetable or increase the range.
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-3 pb-10">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Clock className="h-4 w-4" /> Scrollable timeline
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Events flow across midnight
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[54px_1fr_1fr_54px] border-b border-slate-100 bg-slate-50 px-2 py-3 text-xs font-bold text-slate-500">
              <div>Time</div>
              <div className="flex items-center justify-center gap-1 text-center">
                <UserRound className="h-3 w-3" /> You
              </div>
              <div className="flex items-center justify-center gap-1 text-center">
                <UserRound className="h-3 w-3" /> Her
              </div>
              <div className="text-right">{otherTimeLabel}</div>
            </div>

            <div
              ref={timelineScrollRef}
              className="max-h-[70vh] overflow-y-auto overscroll-contain"
            >
              <div
                className="relative grid grid-cols-[54px_1fr_1fr_54px] px-2"
                style={{ height: timeline.totalHeight }}
              >
                <div className="relative border-r border-slate-100">
                  {hourMarkers.map((marker) => (
                    <div
                      key={marker.date.getTime()}
                      className="absolute left-0 right-2 -translate-y-2 text-[11px] font-semibold text-slate-400"
                      style={{ top: marker.top }}
                    >
                      {formatTimeInZone(marker.date, viewerTimeZone)}
                    </div>
                  ))}
                </div>

                <div className="relative border-r border-slate-100">
                  {hourMarkers.map((marker) => (
                    <div
                      key={marker.date.getTime()}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: marker.top }}
                    />
                  ))}
                  {youBlocks.map((block) => (
                    <MemoTimelineBlock
                      key={`${block.startUtc.getTime()}-${block.endUtc.getTime()}-${block.type}`}
                      block={block}
                    />
                  ))}
                  {dayDividers
                    .filter((d) => d.owner === "you")
                    .map((divider) => (
                      <div
                        key={`${divider.date.getTime()}-${divider.owner}`}
                        className="pointer-events-none absolute left-0 right-0 z-10 flex items-center gap-2"
                        style={{ top: divider.top }}
                      >
                        <div className="h-px flex-1 bg-slate-200" />

                        <div className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm bg-white border-slate-200 text-slate-700">
                          <div className="whitespace-nowrap">
                            {divider.label}
                          </div>
                          <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                            You
                          </div>
                        </div>

                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    ))}
                </div>

                <div className="relative border-r border-slate-100">
                  {hourMarkers.map((marker) => (
                    <div
                      key={marker.date.getTime()}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: marker.top }}
                    />
                  ))}
                  {partnerBlocks.map((block) => (
                    <MemoTimelineBlock
                      key={`${block.startUtc.getTime()}-${block.endUtc.getTime()}-${block.type}`}
                      block={block}
                    />
                  ))}
                  {dayDividers
                    .filter((d) => d.owner === "her")
                    .map((divider) => (
                      <div
                        key={`${divider.date.getTime()}-${divider.owner}`}
                        className="pointer-events-none absolute left-0 right-0 z-10 flex items-center gap-2"
                        style={{ top: divider.top }}
                      >
                        <div className="h-px flex-1 bg-slate-200" />

                        <div className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm bg-white border-pink-100 text-pink-700">
                          <div className="whitespace-nowrap">
                            {divider.label}
                          </div>
                          <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                            Her
                          </div>
                        </div>

                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    ))}
                </div>

                <div className="relative">
                  {hourMarkers.map((marker) => (
                    <div
                      key={marker.date.getTime()}
                      className="absolute left-2 right-0 -translate-y-2 text-right text-[11px] font-semibold text-slate-400"
                      style={{ top: marker.top }}
                    >
                      {formatTimeInZone(marker.date, otherTimeZone)}
                    </div>
                  ))}
                </div>
                {/* dividers are rendered inside each person's column so they only appear over that column */}

                <div
                  className="pointer-events-none absolute z-20"
                  style={{
                    top: nowTop,
                    left: 54,
                    right: 54,
                  }}
                >
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-pink-600 shadow-sm" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                    Now
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <Moon className="mb-1 h-4 w-4" /> Starry blocks mean asleep.
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <Sun className="mb-1 h-4 w-4" /> Green means free to talk.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
