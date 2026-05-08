import { DEFAULT_EVENTS } from "./events";

export const EVENTS_STORAGE_KEY = "together-time-events-v1";

export function cloneDefaultEvents() {
  return {
    you: DEFAULT_EVENTS.you.map((event) => ({ ...event })),
    partner: DEFAULT_EVENTS.partner.map((event) => ({ ...event })),
  };
}

export function loadEventsFromStorage() {
  try {
    const saved = window.localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!saved) return cloneDefaultEvents();

    const parsed = JSON.parse(saved);
    return {
      you: Array.isArray(parsed.you) ? parsed.you : cloneDefaultEvents().you,
      partner: Array.isArray(parsed.partner) ? parsed.partner : cloneDefaultEvents().partner,
    };
  } catch {
    return cloneDefaultEvents();
  }
}

export function saveEventsToStorage(eventsByPerson) {
  window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(eventsByPerson));
}

export function resetEventsInStorage() {
  const defaults = cloneDefaultEvents();
  saveEventsToStorage(defaults);
  return defaults;
}
