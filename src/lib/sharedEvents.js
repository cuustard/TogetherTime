import { DAY_KEYS } from "../constants/timeline";
import { PEOPLE } from "../data/people";
import { supabase } from "./supabase";

const EMPTY_EVENTS_BY_PERSON = {
  you: [],
  partner: [],
};

function stripSeconds(timeValue) {
  if (!timeValue) return "";
  return String(timeValue).slice(0, 5);
}

function dayIndexesToKeys(dayIndexes = []) {
  if (!Array.isArray(dayIndexes)) return [];

  return dayIndexes
    .map((index) => DAY_KEYS[index])
    .filter(Boolean);
}

function dayKeysToIndexes(dayKeys = []) {
  if (!Array.isArray(dayKeys)) return [];

  return dayKeys
    .map((day) => DAY_KEYS.indexOf(day))
    .filter((index) => index >= 0);
}

export function createEmptyEventsByPerson() {
  return {
    you: [],
    partner: [],
  };
}

export function rowToAppEvent(row, ownerKey, people = PEOPLE) {
  const baseEvent = {
    id: row.id,
    owner: ownerKey,
    ownerUserId: row.owner_user_id,
    kind: row.event_kind,
    label: row.title,
    title: row.title,
    type: row.availability,
    timezone: row.timezone || people[ownerKey]?.homeTimeZone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.event_kind === "one_off") {
    return {
      ...baseEvent,
      startAt: row.start_at,
      endAt: row.end_at,
    };
  }

  return {
    ...baseEvent,
    days: dayIndexesToKeys(row.days_of_week),
    start: stripSeconds(row.start_time),
    end: stripSeconds(row.end_time),
  };
}

export function rowsToEventsByPerson(rows, currentUserId, viewerKey, otherPersonKey, people = PEOPLE) {
  const eventsByPerson = createEmptyEventsByPerson();

  rows.forEach((row) => {
    const ownerKey = row.owner_user_id === currentUserId ? viewerKey : otherPersonKey;
    eventsByPerson[ownerKey].push(rowToAppEvent(row, ownerKey, people));
  });

  return eventsByPerson;
}

export function appEventToInsertRow(event, { timelineId, userId, people = PEOPLE }) {
  const title = (event.title || event.label || "Untitled event").trim();
  const baseRow = {
    timeline_id: timelineId,
    owner_user_id: userId,
    title,
    availability: event.type,
    event_kind: event.kind,
    timezone: event.timezone || people[event.owner]?.homeTimeZone,
  };

  if (event.kind === "one_off") {
    return {
      ...baseRow,
      start_at: event.startAt,
      end_at: event.endAt,
      days_of_week: null,
      start_time: null,
      end_time: null,
    };
  }

  return {
    ...baseRow,
    start_at: null,
    end_at: null,
    days_of_week: dayKeysToIndexes(event.days),
    start_time: event.start,
    end_time: event.end,
  };
}

export function appEventToUpdateRow(event, people = PEOPLE) {
  const title = (event.title || event.label || "Untitled event").trim();
  const baseRow = {
    title,
    availability: event.type,
    event_kind: event.kind,
    timezone: event.timezone || people[event.owner]?.homeTimeZone,
  };

  if (event.kind === "one_off") {
    return {
      ...baseRow,
      start_at: event.startAt,
      end_at: event.endAt,
      days_of_week: null,
      start_time: null,
      end_time: null,
    };
  }

  return {
    ...baseRow,
    start_at: null,
    end_at: null,
    days_of_week: dayKeysToIndexes(event.days),
    start_time: event.start,
    end_time: event.end,
  };
}

export async function fetchTimelineEvents({
  timelineId,
  currentUserId,
  viewerKey,
  otherPersonKey,
  people = PEOPLE,
}) {
  if (!timelineId || !currentUserId) return EMPTY_EVENTS_BY_PERSON;

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, timeline_id, owner_user_id, title, availability, event_kind, start_at, end_at, days_of_week, start_time, end_time, timezone, created_at, updated_at",
    )
    .eq("timeline_id", timelineId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return rowsToEventsByPerson(data || [], currentUserId, viewerKey, otherPersonKey, people);
}

export async function createTimelineEvent({ event, timelineId, userId, viewerKey, people = PEOPLE }) {
  const { data, error } = await supabase
    .from("events")
    .insert(appEventToInsertRow(event, { timelineId, userId, people }))
    .select(
      "id, timeline_id, owner_user_id, title, availability, event_kind, start_at, end_at, days_of_week, start_time, end_time, timezone, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  return rowToAppEvent(data, viewerKey, people);
}

export async function updateTimelineEvent({ event, viewerKey, people = PEOPLE }) {
  const { data, error } = await supabase
    .from("events")
    .update(appEventToUpdateRow(event, people))
    .eq("id", event.id)
    .select(
      "id, timeline_id, owner_user_id, title, availability, event_kind, start_at, end_at, days_of_week, start_time, end_time, timezone, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  return rowToAppEvent(data, viewerKey, people);
}

export async function deleteTimelineEvent(eventId) {
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) throw error;
}
