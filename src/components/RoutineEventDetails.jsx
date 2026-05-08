import { Edit3, Lock, Repeat, Trash2, X } from "lucide-react";
import { STATUS_LABELS, STATUS_STYLES } from "../constants/availability";
import { DAY_KEYS } from "../constants/timeline";
import { PEOPLE } from "../data/people";
import { prettyTimeZone } from "../lib/time";
import { Card, CardContent } from "./Card";
import { RoutineEventComposer } from "./RoutineEventComposer";

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

export function RoutineEventDetails({
  event,
  viewer,
  isEditing,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}) {
  if (!event) return null;

  const canEdit = event.owner === viewer;
  const owner = PEOPLE[event.owner];
  const styleClass = STATUS_STYLES[event.type] || STATUS_STYLES.unknown;
  const homeTimeZone = event.timezone || owner.homeTimeZone;

  if (isEditing && canEdit) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-4">
        <RoutineEventComposer
          viewer={viewer}
          initialEvent={event}
          mode="edit"
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-4">
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-lg font-black text-slate-950">
                {owner.emoji} {event.label}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Repeat className="h-3 w-3" /> {owner.name}'s recurring event
              </div>
            </div>
            <button
              className="rounded-full bg-slate-100 p-2 text-slate-500 active:scale-95"
              type="button"
              onClick={onClose}
              aria-label="Close recurring event details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className={`rounded-2xl border px-3 py-2 text-sm font-bold ${styleClass}`}>
            {STATUS_LABELS[event.type] || event.type}
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Repeats
              </div>
              <div className="mt-1 font-black text-slate-950">
                {formatRepeatDays(event.days)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {owner.name}'s home time
              </div>
              <div className="mt-1 font-black text-slate-950">
                {event.start}–{event.end}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-slate-500">
                {prettyTimeZone(homeTimeZone)}{event.end <= event.start ? " · overnight" : ""}
              </div>
            </div>
          </div>

          {canEdit ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white active:scale-[0.99]"
                type="button"
                onClick={onStartEdit}
              >
                <Edit3 className="h-4 w-4" /> Edit
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 active:scale-[0.99]"
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete recurring event “${event.label}”?`)) {
                    onDelete(event.owner, event.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <Lock className="h-4 w-4" /> This is view-only because it belongs to {owner.name}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
