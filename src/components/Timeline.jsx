import { memo, useMemo } from "react";
import { Check, Clock, RefreshCcw } from "lucide-react";
import { formatTimeInZone } from "../lib/time";
import { MemoTimelineBlock } from "./TimelineBlock";

// Inject CSS for fade-out animation
if (
  typeof document !== "undefined" &&
  !document.getElementById("timeline-fade-animation")
) {
  const style = document.createElement("style");
  style.id = "timeline-fade-animation";
  style.innerHTML = `
    @keyframes fadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
    .animate-fade-out {
      animation: fadeOut 2s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

function DayDivider({ divider, variant, label }) {
  const isHer = variant === "her";
  return (
    <div
      className="pointer-events-none absolute left-0 right-2 z-10 flex items-center gap-2"
      style={{ top: divider.top, transform: "translateY(-50%)" }}
    >
      <div className="h-px flex-1 bg-slate-200" />
      <div
        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm bg-white ${
          isHer
            ? "border-pink-100 text-pink-700"
            : "border-slate-200 text-slate-700"
        }`}
      >
        <div className="whitespace-nowrap">{divider.label}</div>
        <div className="mt-0.5 text-[10px] font-medium text-slate-400">
          {label}
        </div>
      </div>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function Timeline({
  timelineScrollRef,
  timeline,
  hourMarkers,
  dayDividers,
  youBlocks,
  partnerBlocks,
  viewerTimeZone,
  otherTimeZone,
  nowTop,
  onSelectEvent,
  people,
  hasPartner,
  onRefreshSharedEvents,
  refreshDisabled,
  showRefreshCheck,
}) {
  const youDayDividers = useMemo(
    () => dayDividers.filter((divider) => divider.owner === "you"),
    [dayDividers],
  );

  const partnerDayDividers = useMemo(
    () => dayDividers.filter((divider) => divider.owner === "her"),
    [dayDividers],
  );

  return (
    <section className="space-y-3 pb-10">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Clock className="h-4 w-4" /> Timeline
        </div>
        <button
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 active:scale-95 disabled:opacity-60 relative"
          type="button"
          onClick={onRefreshSharedEvents}
          disabled={refreshDisabled}
        >
          {showRefreshCheck ? (
            <Check className="h-3.5 w-3.5 text-green-600 animate-fade-out" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          ref={timelineScrollRef}
          className="max-h-[70vh] overflow-y-auto overscroll-contain"
        >
          <div className="sticky top-0 z-20 grid h-12 grid-cols-[36px_1fr_1fr_36px] border-b border-slate-100 bg-slate-50 px-2 text-xs font-bold text-slate-500">
            <div aria-hidden="true" />
            <div className="relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 whitespace-nowrap">
                {people.you.name}
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 whitespace-nowrap">
                {hasPartner ? people.partner.name : "Partner"}
              </div>
            </div>
            <div className="text-right" aria-hidden="true" />
          </div>

          <div
            className="relative grid grid-cols-[36px_1fr_1fr_36px] px-2 pt-10 pb-10"
            style={{ height: timeline.totalHeight }}
          >
            <div className="relative border-r border-slate-100">
              {hourMarkers.map((marker) => (
                <div
                  key={marker.date.getTime()}
                  className="absolute left-0 right-2 -translate-y-2 text-[11px] font-semibold text-slate-400"
                  style={{ top: marker.top }}
                >
                  {formatTimeInZone(marker.date, viewerTimeZone)}
                </div>
              ))}
            </div>

            <div className="relative border-r border-slate-100">
              {hourMarkers.map((marker) => (
                <div
                  key={marker.date.getTime()}
                  className="absolute left-0 right-0 border-t border-slate-100"
                  style={{ top: marker.top }}
                />
              ))}
              {youBlocks.map((block) => (
                <MemoTimelineBlock
                  key={`${block.startUtc.getTime()}-${block.endUtc.getTime()}-${block.type}`}
                  block={block}
                  onSelectEvent={onSelectEvent}
                  people={people}
                />
              ))}
              {youDayDividers.map((divider) => (
                <DayDivider
                  key={`${divider.date.getTime()}-${divider.owner}`}
                  divider={divider}
                  variant="you"
                  label={people.you.name}
                />
              ))}
            </div>

            <div className="relative border-r border-slate-100">
              {hourMarkers.map((marker) => (
                <div
                  key={marker.date.getTime()}
                  className="absolute left-0 right-0 border-t border-slate-100"
                  style={{ top: marker.top }}
                />
              ))}
              {partnerBlocks.map((block) => (
                <MemoTimelineBlock
                  key={`${block.startUtc.getTime()}-${block.endUtc.getTime()}-${block.type}`}
                  block={block}
                  onSelectEvent={onSelectEvent}
                  people={people}
                />
              ))}
              {partnerDayDividers.map((divider) => (
                <DayDivider
                  key={`${divider.date.getTime()}-${divider.owner}`}
                  divider={divider}
                  variant="her"
                  label={hasPartner ? people.partner.name : "Partner"}
                />
              ))}
            </div>

            <div className="relative">
              {hourMarkers.map((marker) => (
                <div
                  key={marker.date.getTime()}
                  className="absolute left-2 right-0 -translate-y-2 text-right text-[11px] font-semibold text-slate-400"
                  style={{ top: marker.top }}
                >
                  {formatTimeInZone(marker.date, otherTimeZone)}
                </div>
              ))}
            </div>

            <div
              className="pointer-events-none absolute z-10"
              style={{
                top: nowTop,
                left: 36,
                right: 36,
              }}
            >
              <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-pink-600 shadow-sm" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                Now
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const MemoTimeline = memo(Timeline);
export { MemoTimeline as Timeline };
