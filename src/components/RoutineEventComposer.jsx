import { useEffect, useMemo, useState } from "react";
import { Check, Repeat, X } from "lucide-react";
import { STATUS_LABELS } from "../constants/availability";
import { DAY_KEYS } from "../constants/timeline";
import { PEOPLE } from "../data/people";
import { routineEventToForm, routineFormToEvent } from "../lib/events";
import { prettyTimeZone } from "../lib/time";
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

export function RoutineEventComposer({
  viewer,
  onAdd,
  onSave,
  onCancel,
  initialEvent = null,
  mode = "add",
}) {
  const isEditing = mode === "edit" && initialEvent;
  const initialForm = useMemo(() => {
    if (isEditing) return routineEventToForm(initialEvent);

    return {
      owner: viewer,
      title: "",
      type: "busy",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startTime: "09:00",
      endTime: "10:00",
    };
  }, [initialEvent, isEditing, viewer]);

  const [owner, setOwner] = useState(initialForm.owner);
  const [title, setTitle] = useState(initialForm.title);
  const [type, setType] = useState(initialForm.type);
  const [days, setDays] = useState(initialForm.days);
  const [startTime, setStartTime] = useState(initialForm.startTime);
  const [endTime, setEndTime] = useState(initialForm.endTime);
  const [error, setError] = useState("");

  useEffect(() => {
    setOwner(viewer);
    setTitle(initialForm.title);
    setType(initialForm.type);
    setDays(initialForm.days);
    setStartTime(initialForm.startTime);
    setEndTime(initialForm.endTime);
    setError("");
  }, [initialForm, viewer]);

  function toggleDay(day) {
    setDays((currentDays) =>
      currentDays.includes(day)
        ? currentDays.filter((item) => item !== day)
        : [...currentDays, day],
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Give the recurring event a title first.");
      return;
    }

    if (days.length === 0) {
      setError("Choose at least one repeat day.");
      return;
    }

    if (!startTime || !endTime) {
      setError("Add a start and end time.");
      return;
    }

    if (startTime === endTime) {
      setError("Start and end time cannot be the same. Earlier end times are allowed for overnight routines.");
      return;
    }

    const nextEvent = routineFormToEvent({
      id: initialEvent?.id,
      owner: viewer,
      title,
      type,
      days,
      startTime,
      endTime,
      createdAt: initialEvent?.createdAt,
    });

    if (isEditing) {
      onSave(initialEvent.owner, nextEvent);
      return;
    }

    onAdd(nextEvent);
    setTitle("");
  }

  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              {isEditing ? <Check className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              {isEditing ? "Edit recurring event" : "Add a recurring event"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {isEditing
                ? `Editing as ${PEOPLE[viewer].name}. You can only change your own recurring events.`
                : `Adding as ${PEOPLE[viewer].name}. Repeats weekly and is stored locally for now.`}
            </div>
          </div>

          {isEditing && onCancel && (
            <button
              className="rounded-full bg-slate-100 p-2 text-slate-500 active:scale-95"
              type="button"
              onClick={onCancel}
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-xs font-bold text-slate-500">
            Title
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-pink-300 focus:bg-white"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Work, gym, sleep, class..."
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-500">
              Person
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500 outline-none"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                disabled
              >
                <option value="you">Jake</option>
                <option value="partner">Amy</option>
              </select>
            </label>

            <label className="block text-xs font-bold text-slate-500">
              Type
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-pink-300 focus:bg-white"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="busy">{STATUS_LABELS.busy}</option>
                <option value="maybe">{STATUS_LABELS.maybe}</option>
                <option value="free">{STATUS_LABELS.free}</option>
                <option value="sleep">{STATUS_LABELS.sleep}</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500">Repeat days</div>
            <div className="grid grid-cols-7 gap-1">
              {DAY_KEYS.map((day) => {
                const selected = days.includes(day);
                return (
                  <button
                    key={day}
                    className={`rounded-xl px-1 py-2 text-[11px] font-black active:scale-95 ${
                      selected
                        ? "bg-pink-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={selected}
                  >
                    {DAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-500">
              Start time
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-pink-300 focus:bg-white"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </label>

            <label className="block text-xs font-bold text-slate-500">
              End time
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-pink-300 focus:bg-white"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
          </div>

          <div className="text-xs text-slate-500">
            Times are entered in {PEOPLE[owner].name}'s home timezone: {prettyTimeZone(PEOPLE[owner].homeTimeZone)}. If the end time is earlier than the start time, it flows overnight.
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <button
            className="w-full rounded-2xl bg-pink-600 px-4 py-2.5 text-sm font-black text-white shadow-sm active:scale-[0.99]"
            type="submit"
          >
            {isEditing ? "Save changes" : "Add recurring event"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
