import { useEffect, useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { PEOPLE } from "../data/people";
import { oneOffEventToForm, oneOffFormToEvent } from "../lib/events";
import { getDateInputValue, prettyTimeZone } from "../lib/time";
import { Card, CardContent } from "./Card";

function isBlank(value) {
  return !String(value || "").trim();
}

export function OneOffEventComposer({
  viewer,
  now,
  onAdd,
  onSave,
  onCancel,
  initialEvent = null,
  mode = "add",
}) {
  const isEditing = mode === "edit" && initialEvent;
  const initialForm = useMemo(() => {
    if (isEditing) return oneOffEventToForm(initialEvent);

    const todayForViewer = getDateInputValue(now, PEOPLE[viewer].homeTimeZone);
    return {
      owner: viewer,
      title: "",
      type: "busy",
      startDate: todayForViewer,
      startTime: "18:00",
      endDate: todayForViewer,
      endTime: "19:00",
    };
  }, [initialEvent, isEditing, now, viewer]);

  const [owner, setOwner] = useState(viewer);
  const [title, setTitle] = useState(initialForm.title);
  const [type, setType] = useState(initialForm.type);
  const [startDate, setStartDate] = useState(initialForm.startDate);
  const [startTime, setStartTime] = useState(initialForm.startTime);
  const [endDate, setEndDate] = useState(initialForm.endDate);
  const [endTime, setEndTime] = useState(initialForm.endTime);
  const [error, setError] = useState("");

  useEffect(() => {
    setOwner(viewer);
    setTitle(initialForm.title);
    setType(initialForm.type);
    setStartDate(initialForm.startDate);
    setStartTime(initialForm.startTime);
    setEndDate(initialForm.endDate);
    setEndTime(initialForm.endTime);
    setError("");
  }, [initialForm, viewer]);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isBlank(title)) {
      setError("Give the event a title first.");
      return;
    }

    if (!startDate || !endDate || !startTime || !endTime) {
      setError("Add a start date, start time, end date, and end time.");
      return;
    }

    const nextEvent = oneOffFormToEvent({
      id: initialEvent?.id,
      owner: viewer,
      title,
      type,
      startDate,
      startTime,
      endDate,
      endTime,
      createdAt: initialEvent?.createdAt,
    });

    if (new Date(nextEvent.endAt) <= new Date(nextEvent.startAt)) {
      setError("The end needs to be after the start. For overnight one-offs, use the next day as the end date.");
      return;
    }

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
              {isEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEditing ? "Edit one-off event" : "Add a one-off event"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {isEditing
                ? `Editing as ${PEOPLE[viewer].name}. You can only change your own events.`
                : `Adding as ${PEOPLE[viewer].name}. One-off events happen once at an exact time.`}
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
              placeholder="Dinner, exam, flight, night out..."
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
                <option value="busy">Busy</option>
                <option value="maybe">Maybe</option>
                <option value="free">Free</option>
                <option value="sleep">Sleep</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-500">
              Start date
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-pink-300 focus:bg-white"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (!endDate || endDate < event.target.value) {
                    setEndDate(event.target.value);
                  }
                }}
              />
            </label>

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
              End date
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-pink-300 focus:bg-white"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
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

          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Times are entered in {PEOPLE[viewer].name}'s home timezone: {prettyTimeZone(PEOPLE[viewer].homeTimeZone)}. For overnight events, set the end date to the next day.
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
            {isEditing ? "Save changes" : "Add one-off event"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
