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
export const ROUTINE_SCHEDULES = {
  you: [
    { days: SCHOOL_NIGHTS, start: "23:00", end: "07:30", type: "sleep", label: "Sleep" },
    { days: WEEKEND_NIGHTS, start: "00:00", end: "09:00", type: "sleep", label: "Sleep" },
    { days: WEEKDAYS, start: "07:30", end: "09:00", type: "free", label: "Free" },
    { days: WEEKDAYS, start: "09:00", end: "15:00", type: "busy", label: "Uni / study" },
    { days: WEEKDAYS, start: "19:00", end: "22:00", type: "free", label: "Free" },
    { days: WEEKDAYS, start: "22:00", end: "23:00", type: "free", label: "CALL AMY" },
    { days: ["saturday"], start: "12:00", end: "22:30", type: "free", label: "Free" },
    { days: ["sunday"], start: "13:00", end: "21:30", type: "free", label: "Free" },
  ],
  partner: [
    { days: SCHOOL_NIGHTS, start: "22:00", end: "07:00", type: "sleep", label: "Sleep" },
    { days: WEEKEND_NIGHTS, start: "21:30", end: "08:30", type: "sleep", label: "Sleep" },
    { days: WEEKDAYS, start: "09:00", end: "14:00", type: "busy", label: "Class / study" },
    { days: WEEKDAYS, start: "17:30", end: "22:00", type: "free", label: "Free" },
    { days: ["saturday", "sunday"], start: "12:00", end: "21:30", type: "free", label: "Free" },
  ],
};
