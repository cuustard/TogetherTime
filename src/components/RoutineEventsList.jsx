import { Edit3, Lock, Repeat, Trash2 } from "lucide-react";
import { STATUS_LABELS } from "../constants/availability";
import { DAY_KEYS } from "../constants/timeline";
import { PEOPLE } from "../data/people";
import { Card, CardContent } from "./Card";

const DAY_LABELS = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function formatRepeatDays(days = []) {
  const ordered = DAY_KEYS.filter((day) => days.includes(day));
  if (ordered.length === 7) return "Every day";
  if (ordered.join(",") === DAY_KEYS.slice(0, 5).join(",")) return "Weekdays";
  if (ordered.join(",") === DAY_KEYS.slice(5).join(",")) return "Weekends";
  return ordered.map((day) => DAY_LABELS[day]).join(", ");
}

export function RoutineEventsList({ eventsByPerson, viewer, onSelect, onRemove }) {
  const routineEvents = [
    ...eventsByPerson.you.map((event) => ({ ...event, owner: "you" })),
    ...eventsByPerson.partner.map((event) => ({ ...event, owner: "partner" })),
  ]
    .filter((event) => event.kind === "routine")
    .sort((a, b) => {
      if (a.owner !== b.owner) return a.owner === viewer ? -1 : 1;
      return (a.start || "").localeCompare(b.start || "");
    });

  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Repeat className="h-4 w-4" /> Recurring events
        </div>
        {routineEvents.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No recurring events yet. Add sleep, work, uni, gym, or free-time blocks to build the weekly rhythm.
          </div>
        ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {routineEvents.map((event) => {
            const canEdit = event.owner === viewer;
            return (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3"
              >
                <button
                  className="min-w-0 flex-1 text-left active:scale-[0.995]"
                  type="button"
                  onClick={() => onSelect(event.owner, event.id)}
                >
                  <div className="truncate text-sm font-bold text-slate-950">
                    {PEOPLE[event.owner].emoji} {event.label}
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {formatRepeatDays(event.days)} · {event.start}–{event.end} · {STATUS_LABELS[event.type] || event.type}
                  </div>
                </button>

                {canEdit ? (
                  <button
                    className="rounded-full bg-white p-2 text-slate-400 shadow-sm active:scale-95"
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete recurring event “${event.label}”?`)) {
                        onRemove(event.owner, event.id);
                      }
                    }}
                    aria-label={`Delete ${event.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="rounded-full bg-white p-2 text-slate-300 shadow-sm" title="View-only">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
          <Edit3 className="h-3 w-3" /> Tap a recurring event to view details.
        </div>
      </CardContent>
    </Card>
  );
}
