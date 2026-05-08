import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Heart, LogOut, MapPin, RefreshCcw } from "lucide-react";
import { Card, CardContent } from "./components/Card";
import { OneOffEventComposer } from "./components/OneOffEventComposer";
import { OneOffEventDetails } from "./components/OneOffEventDetails";
import { RoutineEventComposer } from "./components/RoutineEventComposer";
import { RoutineEventDetails } from "./components/RoutineEventDetails";
import { RoutineEventsList } from "./components/RoutineEventsList";
import { MemoOverlapCard } from "./components/OverlapCard";
import { MemoCombinedPersonStatus } from "./components/StatusCards";
import { Timeline } from "./components/Timeline";
import { UpcomingOneOffEvents } from "./components/UpcomingOneOffEvents";
import { PEOPLE } from "./data/people";
import {
  buildDayDividers,
  buildHourMarkers,
  buildVisibleBlocks,
  findOverlapWindows,
  getStatusAt,
  getTimelineBounds,
} from "./lib/events";
import { loadEventsFromStorage, resetEventsInStorage, saveEventsToStorage } from "./lib/storage";
import {
  formatOffsetLabel,
  formatTimeInZone,
  getLocalTimeZone,
  getTimeZoneOffsetMinutes,
  prettyTimeZone,
} from "./lib/time";
import { supabase } from "./lib/supabase";
import { fetchProfile } from "./lib/profiles";
import { fetchUserTimeline } from "./lib/timelines";
import AuthScreen from "./components/AuthScreen";
import ProfileOnboarding from "./components/ProfileOnboarding";
import TimelineOnboarding from "./components/TimelineOnboarding";

// Together Time
// Mobile-first relationship timezone planner.
// The timeline is a continuous, scrollable stream of time.
// Events can cross midnight, e.g. Sleep: Monday 22:30 → Tuesday 07:30.
// The main timeline always uses the device/browser timezone.
// Each person's timetable stays anchored to their home timezone.

export default function TogetherTimeApp() {
  const [localTimeZone, setLocalTimeZone] = useState(getLocalTimeZone);
  const [now, setNow] = useState(() => new Date());
  const [eventsByPerson, setEventsByPerson] = useState(loadEventsFromStorage);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [composerKind, setComposerKind] = useState("one_off");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [sharedTimeline, setSharedTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");
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
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!session?.user?.id) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError("");
      return () => {
        isMounted = false;
      };
    }

    setProfileLoading(true);
    setProfileError("");

    fetchProfile(session.user.id)
      .then((nextProfile) => {
        if (!isMounted) return;
        setProfile(nextProfile);
      })
      .catch((error) => {
        if (!isMounted) return;
        setProfileError(error.message || "Could not load your profile.");
      })
      .finally(() => {
        if (!isMounted) return;
        setProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let isMounted = true;

    if (!session?.user?.id || !profile) {
      setSharedTimeline(null);
      setTimelineLoading(false);
      setTimelineError("");
      return () => {
        isMounted = false;
      };
    }

    setTimelineLoading(true);
    setTimelineError("");

    fetchUserTimeline(session.user.id)
      .then((nextTimeline) => {
        if (!isMounted) return;
        setSharedTimeline(nextTimeline);
      })
      .catch((error) => {
        if (!isMounted) return;
        setTimelineError(error.message || "Could not load your timeline.");
      })
      .finally(() => {
        if (!isMounted) return;
        setTimelineLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id, profile]);

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

  useEffect(() => {
    saveEventsToStorage(eventsByPerson);
  }, [eventsByPerson]);

  function addEvent(event) {
    if (event.owner !== viewer) return;

    setEventsByPerson((currentEvents) => ({
      ...currentEvents,
      [event.owner]: [...(currentEvents[event.owner] || []), event],
    }));
  }

  function selectEvent(owner, eventId, kind) {
    setSelectedEvent({ owner, eventId, kind });
    setEditingEventId(null);
  }

  function updateEvent(previousOwner, nextEvent) {
    if (previousOwner !== viewer || nextEvent.owner !== viewer) return;

    setEventsByPerson((currentEvents) => {
      const withoutOldEvent = (currentEvents[previousOwner] || []).filter(
        (event) => event.id !== nextEvent.id,
      );

      return {
        ...currentEvents,
        [previousOwner]: [...withoutOldEvent, nextEvent],
      };
    });

    setSelectedEvent({ owner: nextEvent.owner, eventId: nextEvent.id, kind: nextEvent.kind });
    setEditingEventId(null);
  }

  function removeEvent(owner, eventId) {
    if (owner !== viewer) return;

    setEventsByPerson((currentEvents) => ({
      ...currentEvents,
      [owner]: (currentEvents[owner] || []).filter((event) => event.id !== eventId),
    }));

    setSelectedEvent((currentSelection) =>
      currentSelection?.owner === owner && currentSelection?.eventId === eventId
        ? null
        : currentSelection,
    );
    setEditingEventId((currentEventId) =>
      currentEventId === eventId ? null : currentEventId,
    );
  }

  function resetDemoData() {
    if (!window.confirm("Reset local demo data? This restores the default recurring schedules and clears custom events on this device.")) {
      return;
    }

    setEventsByPerson(resetEventsInStorage());
    setSelectedEvent(null);
    setEditingEventId(null);
    setComposerKind("one_off");
  }

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
        eventsByPerson,
      ),
    [timeline.startUtc, timeline.endUtc, timeline.totalHeight, eventsByPerson],
  );

  const partnerBlocks = useMemo(
    () =>
      buildVisibleBlocks(
        "partner",
        timeline.startUtc,
        timeline.endUtc,
        timeline.totalHeight,
        eventsByPerson,
      ),
    [timeline.startUtc, timeline.endUtc, timeline.totalHeight, eventsByPerson],
  );

  const overlapWindows = useMemo(
    () => findOverlapWindows(timeline.startUtc, timeline.endUtc, now, eventsByPerson),
    [timeline.startUtc, timeline.endUtc, now, eventsByPerson],
  );

  const nextWindows = overlapWindows
    .filter((window) => window.endDate.getTime() >= now.getTime())
    .slice(0, 3);

  const currentYou = useMemo(
    () => getStatusAt("you", now, eventsByPerson),
    [now, eventsByPerson],
  );

  const currentPartner = useMemo(
    () => getStatusAt("partner", now, eventsByPerson),
    [now, eventsByPerson],
  );

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


  const selectedEventRecord = selectedEvent
    ? (eventsByPerson[selectedEvent.owner] || []).find(
        (event) => event.id === selectedEvent.eventId && event.kind === selectedEvent.kind,
      )
    : null;

  const selectedOneOffEvent =
    selectedEventRecord?.kind === "one_off" ? selectedEventRecord : null;

  const selectedRoutineEvent =
    selectedEventRecord?.kind === "routine" ? selectedEventRecord : null;

  useEffect(() => {
    const scrollEl = timelineScrollRef.current;
    if (!scrollEl) return;

    const desiredTop = Math.max(0, nowTop - scrollEl.clientHeight * 0.38);
    scrollEl.scrollTop = desiredTop;
  }, [viewerTimeZone, nowTop]);


  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pink-50 px-4 text-center text-sm font-bold text-slate-500">
        Loading Together Time...
      </main>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pink-50 px-4 text-center text-sm font-bold text-slate-500">
        Loading your profile...
      </main>
    );
  }

  if (profileError) {
    return (
      <main className="min-h-screen bg-linear-to-b from-pink-50 via-white to-slate-100 px-4 py-8 text-slate-950">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
          <section className="w-full rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-pink-100/70 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-pink-700">
              <Heart className="h-4 w-4 fill-pink-200" />
              Together Time
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight">
              Could not load your profile
            </h1>
            <p className="mt-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {profileError}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="rounded-2xl bg-pink-600 px-4 py-3 text-sm font-black text-white"
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
              <button
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600"
                type="button"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!profile) {
    return <ProfileOnboarding session={session} onComplete={setProfile} />;
  }

  if (timelineLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pink-50 px-4 text-center text-sm font-bold text-slate-500">
        Loading your timeline...
      </main>
    );
  }

  if (timelineError) {
    return (
      <main className="min-h-screen bg-linear-to-b from-pink-50 via-white to-slate-100 px-4 py-8 text-slate-950">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
          <section className="w-full rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-pink-100/70 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-pink-700">
              <Heart className="h-4 w-4 fill-pink-200" />
              Together Time
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight">
              Could not load your timeline
            </h1>
            <p className="mt-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {timelineError}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="rounded-2xl bg-pink-600 px-4 py-3 text-sm font-black text-white"
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
              <button
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600"
                type="button"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!sharedTimeline) {
    return (
      <TimelineOnboarding
        profile={profile}
        session={session}
        onComplete={setSharedTimeline}
      />
    );
  }

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
                Signed in as {profile.display_name} · {sharedTimeline.name} · demo view as {viewerName}
              </div>
              <div className="mt-1 text-xs font-bold text-pink-700">
                Invite code: {sharedTimeline.invite_code}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-2xl bg-white px-3 py-2 text-right text-xs font-semibold text-slate-500 shadow-sm">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Device time
                </div>
                <div className="text-slate-950">
                  {prettyTimeZone(localTimeZone)}
                </div>
              </div>
              <button
                className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm active:scale-95"
                type="button"
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
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

        <section className="space-y-3">
          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="space-y-3 p-3">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                    composerKind === "one_off"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500"
                  }`}
                  type="button"
                  onClick={() => setComposerKind("one_off")}
                >
                  One-off
                </button>
                <button
                  className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                    composerKind === "routine"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500"
                  }`}
                  type="button"
                  onClick={() => setComposerKind("routine")}
                >
                  Recurring
                </button>
              </div>

              <div className="rounded-2xl bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-800">
                Events are locked to {PEOPLE[viewer].name} in this local prototype. The other person’s events are view-only.
              </div>
            </CardContent>
          </Card>

          {composerKind === "one_off" ? (
            <OneOffEventComposer viewer={viewer} now={now} onAdd={addEvent} />
          ) : (
            <RoutineEventComposer viewer={viewer} onAdd={addEvent} />
          )}

          <UpcomingOneOffEvents
            eventsByPerson={eventsByPerson}
            viewer={viewer}
            viewerTimeZone={viewerTimeZone}
            now={now}
            onSelect={(owner, eventId) => selectEvent(owner, eventId, "one_off")}
            onRemove={removeEvent}
          />
          <RoutineEventsList
            eventsByPerson={eventsByPerson}
            viewer={viewer}
            onSelect={(owner, eventId) => selectEvent(owner, eventId, "routine")}
            onRemove={removeEvent}
          />

          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-bold text-slate-800">Local demo data</div>
                <div className="mt-1 text-xs text-slate-500">
                  Reset this device back to the default schedules.
                </div>
              </div>
              <button
                className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 active:scale-95"
                type="button"
                onClick={resetDemoData}
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </CardContent>
          </Card>
        </section>

        <Timeline
          timelineScrollRef={timelineScrollRef}
          timeline={timeline}
          hourMarkers={hourMarkers}
          dayDividers={dayDividers}
          youBlocks={youBlocks}
          partnerBlocks={partnerBlocks}
          viewerTimeZone={viewerTimeZone}
          otherTimeZone={otherTimeZone}
          otherTimeLabel={otherTimeLabel}
          nowTop={nowTop}
          onSelectEvent={selectEvent}
        />

        <OneOffEventDetails
          event={selectedOneOffEvent}
          viewer={viewer}
          viewerTimeZone={viewerTimeZone}
          now={now}
          isEditing={editingEventId === selectedOneOffEvent?.id}
          onClose={() => {
            setSelectedEvent(null);
            setEditingEventId(null);
          }}
          onStartEdit={() => setEditingEventId(selectedOneOffEvent?.id)}
          onCancelEdit={() => setEditingEventId(null)}
          onSave={updateEvent}
          onDelete={removeEvent}
        />

        <RoutineEventDetails
          event={selectedRoutineEvent}
          viewer={viewer}
          isEditing={editingEventId === selectedRoutineEvent?.id}
          onClose={() => {
            setSelectedEvent(null);
            setEditingEventId(null);
          }}
          onStartEdit={() => setEditingEventId(selectedRoutineEvent?.id)}
          onCancelEdit={() => setEditingEventId(null)}
          onSave={updateEvent}
          onDelete={removeEvent}
        />
      </div>
    </main>
  );
}
