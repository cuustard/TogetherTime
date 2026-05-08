import { Edit3, Lock, Trash2 } from "lucide-react";
import { PEOPLE } from "../data/people";
import { formatDateTimeForEventList, formatTimeInZone } from "../lib/time";
import { Card, CardContent } from "./Card";

export function UpcomingOneOffEvents({
  eventsByPerson,
  viewer,
  viewerTimeZone,
  now,
  onSelect,
  onRemove,
}) {
  const nowMs = now?.getTime?.() ?? Date.now();
  const oneOffEvents = [
    ...(eventsByPerson.you || []).map((event) => ({ ...event, owner: "you" })),
    ...(eventsByPerson.partner || []).map((event) => ({ ...event, owner: "partner" })),
  ]
    .filter((event) => event.kind === "one_off")
    .filter((event) => new Date(event.endAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
    .slice(0, 5);

  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="text-sm font-bold text-slate-800">Upcoming one-off events</div>

        {oneOffEvents.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No upcoming one-off events yet. Add things like dinner, exams, flights, nights out, or appointments.
          </div>
        ) : (
          <div className="space-y-2">
            {oneOffEvents.map((event) => {
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
                      {formatDateTimeForEventList(new Date(event.startAt), viewerTimeZone)}–
                      {formatTimeInZone(new Date(event.endAt), viewerTimeZone)}
                    </div>
                  </button>

                  {canEdit ? (
                    <button
                      className="rounded-full bg-white p-2 text-slate-400 shadow-sm active:scale-95"
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete “${event.label}”?`)) {
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
          <Edit3 className="h-3 w-3" /> Tap an event to view details.
        </div>
      </CardContent>
    </Card>
  );
}
