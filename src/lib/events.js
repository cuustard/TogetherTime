import { STATUS_LABELS } from "../constants/availability";
import {
  DAY_KEYS,
  HOUR_HEIGHT,
  MS_PER_DAY,
  MS_PER_HOUR,
  TIMELINE_DAYS_AFTER_TODAY,
  TIMELINE_DAYS_BEFORE_TODAY,
} from "../constants/timeline";
import { PEOPLE } from "../data/people";
import { ROUTINE_SCHEDULES } from "../data/routineSchedules";
import {
  addDaysToDateParts,
  formatDayInZone,
  getDateInputValue,
  getPartsInTimeZone,
  minutesFromTime,
  zonedDateTimeToUtc,
} from "./time";

export function addEventMetadata(personKey, event, index) {
  return {
    ...event,
    id: `${personKey}-routine-${index}`,
    owner: personKey,
    kind: "routine",
    timezone: PEOPLE[personKey].homeTimeZone,
  };
}

export const DEFAULT_EVENTS = {
  you: ROUTINE_SCHEDULES.you.map((event, index) =>
    addEventMetadata("you", event, index),
  ),
  partner: ROUTINE_SCHEDULES.partner.map((event, index) =>
    addEventMetadata("partner", event, index),
  ),
};

const AVAILABILITY_PRIORITY = {
  sleep: 4,
  busy: 3,
  maybe: 2,
  free: 1,
  unknown: 0,
};

function getBlockPriority(block) {
  return AVAILABILITY_PRIORITY[block.type] ?? AVAILABILITY_PRIORITY.unknown;
}

function compareIntervalPriority(a, b) {
  const priorityDifference = getBlockPriority(a) - getBlockPriority(b);
  if (priorityDifference !== 0) return priorityDifference;

  if (a.kind !== b.kind) {
    if (a.kind === "one_off") return 1;
    if (b.kind === "one_off") return -1;
  }

  const aCreated = a.updatedAt || a.createdAt || "";
  const bCreated = b.updatedAt || b.createdAt || "";
  if (aCreated !== bCreated) return aCreated > bCreated ? 1 : -1;

  const aStart = a.startUtc?.getTime?.() ?? 0;
  const bStart = b.startUtc?.getTime?.() ?? 0;
  if (aStart !== bStart) return aStart - bStart;

  return String(a.id || "").localeCompare(String(b.id || ""));
}

function canMergeResolvedSegments(a, b) {
  return (
    a &&
    b &&
    a.id === b.id &&
    a.owner === b.owner &&
    a.kind === b.kind &&
    a.type === b.type &&
    a.label === b.label &&
    a.timezone === b.timezone &&
    a.endUtc.getTime() === b.startUtc.getTime()
  );
}

export function resolveOverlappingIntervals(
  intervals,
  rangeStartUtc,
  rangeEndUtc,
) {
  const rangeStartMs = rangeStartUtc.getTime();
  const rangeEndMs = rangeEndUtc.getTime();
  const usableIntervals = intervals
    .map((interval) => {
      const startMs = Math.max(interval.startUtc.getTime(), rangeStartMs);
      const endMs = Math.min(interval.endUtc.getTime(), rangeEndMs);
      if (endMs <= startMs) return null;

      return {
        ...interval,
        startUtc: new Date(startMs),
        endUtc: new Date(endMs),
      };
    })
    .filter(Boolean);

  if (usableIntervals.length <= 1) return usableIntervals;

  const cutPoints = Array.from(
    new Set(
      usableIntervals.flatMap((interval) => [
        interval.startUtc.getTime(),
        interval.endUtc.getTime(),
      ]),
    ),
  ).sort((a, b) => a - b);

  const resolved = [];

  for (let index = 0; index < cutPoints.length - 1; index += 1) {
    const segmentStart = cutPoints[index];
    const segmentEnd = cutPoints[index + 1];
    if (segmentEnd <= segmentStart) continue;

    const activeIntervals = usableIntervals.filter(
      (interval) =>
        interval.startUtc.getTime() < segmentEnd &&
        interval.endUtc.getTime() > segmentStart,
    );

    if (activeIntervals.length === 0) continue;

    const winner = activeIntervals.reduce((best, candidate) =>
      compareIntervalPriority(candidate, best) > 0 ? candidate : best,
    );

    const nextSegment = {
      ...winner,
      startUtc: new Date(segmentStart),
      endUtc: new Date(segmentEnd),
      sourceStartUtc: winner.startUtc,
      sourceEndUtc: winner.endUtc,
      isResolvedSegment: true,
    };

    const previous = resolved[resolved.length - 1];
    if (canMergeResolvedSegments(previous, nextSegment)) {
      previous.endUtc = nextSegment.endUtc;
    } else {
      resolved.push(nextSegment);
    }
  }

  return resolved;
}

function getDayKeyFromDateParts(parts) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  return DAY_KEYS[date.getUTCDay()];
}

function recurringEventToUtcInterval(
  personKey,
  event,
  startDateParts,
  people = PEOPLE,
) {
  const eventTimeZone =
    event.timezone ||
    people[personKey]?.homeTimeZone ||
    PEOPLE[personKey].homeTimeZone;
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
    eventTimeZone,
  );

  const endUtc = zonedDateTimeToUtc(
    {
      ...endDateParts,
      hour: Math.floor(endMinutes / 60),
      minute: endMinutes % 60,
    },
    eventTimeZone,
  );

  return { ...event, startUtc, endUtc };
}

function getResolvedScheduleIntervals(
  personKey,
  rangeStartUtc,
  rangeEndUtc,
  eventsByPerson = DEFAULT_EVENTS,
  people = PEOPLE,
) {
  return resolveOverlappingIntervals(
    generateScheduleIntervals(
      personKey,
      rangeStartUtc,
      rangeEndUtc,
      eventsByPerson,
      people,
    ),
    rangeStartUtc,
    rangeEndUtc,
  );
}

export function getResolvedScheduleIntervalsForRange(
  personKey,
  rangeStartUtc,
  rangeEndUtc,
  eventsByPerson = DEFAULT_EVENTS,
  people = PEOPLE,
) {
  return getResolvedScheduleIntervals(
    personKey,
    rangeStartUtc,
    rangeEndUtc,
    eventsByPerson,
    people,
  );
}

export function getTimelineBounds(now, viewerTimeZone) {
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

export function generateScheduleIntervals(
  personKey,
  rangeStartUtc,
  rangeEndUtc,
  eventsByPerson = DEFAULT_EVENTS,
  people = PEOPLE,
) {
  const personEvents = eventsByPerson[personKey] || [];
  const routineEvents = personEvents.filter(
    (event) => event.kind === "routine",
  );
  const oneOffEvents = personEvents.filter((event) => event.kind === "one_off");
  const personTimeZone =
    people[personKey]?.homeTimeZone || PEOPLE[personKey].homeTimeZone;
  const startParts = getPartsInTimeZone(rangeStartUtc, personTimeZone);
  const totalDays =
    Math.ceil((rangeEndUtc.getTime() - rangeStartUtc.getTime()) / MS_PER_DAY) +
    4;
  const intervals = [];

  for (let dayOffset = -2; dayOffset <= totalDays; dayOffset += 1) {
    const dateParts = addDaysToDateParts(startParts, dayOffset);
    const dayKey = getDayKeyFromDateParts(dateParts);

    routineEvents.forEach((event) => {
      if (!event.days.includes(dayKey)) return;

      const interval = recurringEventToUtcInterval(
        personKey,
        event,
        dateParts,
        people,
      );
      if (interval.endUtc > rangeStartUtc && interval.startUtc < rangeEndUtc) {
        intervals.push(interval);
      }
    });
  }

  oneOffEvents.forEach((event) => {
    const startUtc = new Date(event.startAt);
    const endUtc = new Date(event.endAt);

    if (Number.isNaN(startUtc.getTime()) || Number.isNaN(endUtc.getTime())) {
      return;
    }

    if (endUtc > rangeStartUtc && startUtc < rangeEndUtc) {
      intervals.push({ ...event, startUtc, endUtc });
    }
  });

  return intervals.sort((a, b) => a.startUtc - b.startUtc);
}

export function buildVisibleBlocksFromIntervals(
  intervals,
  rangeStartUtc,
  rangeEndUtc,
  totalHeight,
) {
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

export function buildVisibleBlocks(
  personKey,
  rangeStartUtc,
  rangeEndUtc,
  totalHeight,
  eventsByPerson = DEFAULT_EVENTS,
  people = PEOPLE,
) {
  const intervals = getResolvedScheduleIntervals(
    personKey,
    rangeStartUtc,
    rangeEndUtc,
    eventsByPerson,
    people,
  );

  return buildVisibleBlocksFromIntervals(
    intervals,
    rangeStartUtc,
    rangeEndUtc,
    totalHeight,
  );
}

export function getStatusAt(
  personKey,
  date,
  eventsByPerson = DEFAULT_EVENTS,
  people = PEOPLE,
) {
  const rangeStartUtc = new Date(date.getTime() - MS_PER_DAY * 2);
  const rangeEndUtc = new Date(date.getTime() + MS_PER_DAY * 2);
  const intervals = getResolvedScheduleIntervals(
    personKey,
    rangeStartUtc,
    rangeEndUtc,
    eventsByPerson,
    people,
  );
  const event = intervals.find(
    (item) => item.startUtc <= date && item.endUtc > date,
  );

  return event || { type: "unknown", label: "Unknown" };
}

function isCallWindowStatus(interval) {
  return ["free", "maybe"].includes(interval.type);
}

function mergeWindowCandidate(windows, window) {
  const previous = windows[windows.length - 1];
  if (
    previous &&
    previous.best === window.best &&
    previous.end === window.start
  ) {
    previous.end = window.end;
    return;
  }

  windows.push(window);
}

export function findOverlapWindows(
  rangeStartUtc,
  rangeEndUtc,
  eventsByPerson,
  people = PEOPLE,
) {
  const youIntervals = getResolvedScheduleIntervals(
    "you",
    rangeStartUtc,
    rangeEndUtc,
    eventsByPerson,
    people,
  );
  const partnerIntervals = getResolvedScheduleIntervals(
    "partner",
    rangeStartUtc,
    rangeEndUtc,
    eventsByPerson,
    people,
  );

  return findOverlapWindowsFromIntervals(youIntervals, partnerIntervals);
}

export function findOverlapWindowsFromIntervals(
  youIntervals,
  partnerIntervals,
) {
  const windows = [];

  let youIndex = 0;
  let partnerIndex = 0;

  while (
    youIndex < youIntervals.length &&
    partnerIndex < partnerIntervals.length
  ) {
    const you = youIntervals[youIndex];
    const partner = partnerIntervals[partnerIndex];
    const segmentStart = Math.max(
      you.startUtc.getTime(),
      partner.startUtc.getTime(),
    );
    const segmentEnd = Math.min(you.endUtc.getTime(), partner.endUtc.getTime());

    if (segmentEnd > segmentStart) {
      const isGood = isCallWindowStatus(you) && isCallWindowStatus(partner);
      if (isGood) {
        mergeWindowCandidate(windows, {
          start: segmentStart,
          end: segmentEnd,
          best: you.type === "free" && partner.type === "free",
        });
      }
    }

    if (you.endUtc.getTime() <= partner.endUtc.getTime()) {
      youIndex += 1;
    }
    if (partner.endUtc.getTime() <= you.endUtc.getTime()) {
      partnerIndex += 1;
    }
  }

  return windows.map((window) => ({
    ...window,
    startDate: new Date(window.start),
    endDate: new Date(window.end),
  }));
}

export function createLocalEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function oneOffFormToEvent({
  id,
  owner,
  title,
  type,
  startDate,
  startTime,
  endDate,
  endTime,
  createdAt,
  people = PEOPLE,
}) {
  const timezone = people[owner]?.homeTimeZone || PEOPLE[owner].homeTimeZone;
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const startMinutes = minutesFromTime(startTime);
  const endMinutes = minutesFromTime(endTime);

  const startUtc = zonedDateTimeToUtc(
    {
      year: startYear,
      month: startMonth,
      day: startDay,
      hour: Math.floor(startMinutes / 60),
      minute: startMinutes % 60,
    },
    timezone,
  );

  const endUtc = zonedDateTimeToUtc(
    {
      year: endYear,
      month: endMonth,
      day: endDay,
      hour: Math.floor(endMinutes / 60),
      minute: endMinutes % 60,
    },
    timezone,
  );

  return {
    id: id || createLocalEventId(),
    owner,
    kind: "one_off",
    label: title.trim(),
    title: title.trim(),
    type,
    timezone,
    startAt: startUtc.toISOString(),
    endAt: endUtc.toISOString(),
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function oneOffEventToForm(event, people = PEOPLE) {
  const timezone =
    event.timezone ||
    people[event.owner]?.homeTimeZone ||
    PEOPLE[event.owner].homeTimeZone;

  return {
    owner: event.owner,
    title: event.title || event.label || "",
    type: event.type || "busy",
    startDate: getDateInputValue(new Date(event.startAt), timezone),
    startTime: event.startAt
      ? event.startAt &&
        new Intl.DateTimeFormat("en-GB", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(event.startAt))
      : "18:00",
    endDate: getDateInputValue(new Date(event.endAt), timezone),
    endTime: event.endAt
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(event.endAt))
      : "19:00",
  };
}

export function routineFormToEvent({
  id,
  owner,
  title,
  type,
  days,
  startTime,
  endTime,
  createdAt,
  people = PEOPLE,
}) {
  const cleanedDays = Array.from(new Set(days)).filter(Boolean);

  return {
    id: id || createLocalEventId(),
    owner,
    kind: "routine",
    label: title.trim(),
    title: title.trim(),
    type,
    timezone: people[owner]?.homeTimeZone || PEOPLE[owner].homeTimeZone,
    days: cleanedDays,
    start: startTime,
    end: endTime,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function routineEventToForm(event) {
  return {
    owner: event.owner,
    title: event.title || event.label || "",
    type: event.type || "busy",
    days: Array.isArray(event.days) ? event.days : [],
    startTime: event.start || "09:00",
    endTime: event.end || "10:00",
  };
}

export function buildHourMarkers(rangeStartUtc, totalHours) {
  return Array.from({ length: Math.floor(totalHours) + 1 }).map((_, index) => ({
    index,
    date: new Date(rangeStartUtc.getTime() + index * MS_PER_HOUR),
    top: index * HOUR_HEIGHT,
  }));
}

export function buildDayDividers(
  rangeStartUtc,
  rangeEndUtc,
  viewerTimeZone,
  otherTimeZone,
  totalHeight,
) {
  const entries = [];
  const rangeDuration = rangeEndUtc.getTime() - rangeStartUtc.getTime();

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

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}
