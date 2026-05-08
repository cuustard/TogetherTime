import { Clock, Moon, Sun, UserRound } from "lucide-react";
import { formatTimeInZone } from "../lib/time";
import { MemoTimelineBlock } from "./TimelineBlock";

function DayDivider({ divider, variant, label }) {
  const isHer = variant === "her";
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10 flex items-center gap-2"
      style={{ top: divider.top }}
    >
      <div className="h-px flex-1 bg-slate-200" />
      <div
        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm bg-white ${
          isHer ? "border-pink-100 text-pink-700" : "border-slate-200 text-slate-700"
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

export function Timeline({
  timelineScrollRef,
  timeline,
  hourMarkers,
  dayDividers,
  youBlocks,
  partnerBlocks,
  viewerTimeZone,
  otherTimeZone,
  otherTimeLabel,
  nowTop,
  onSelectEvent,
  people,
  hasPartner,
}) {
  return (
    <section className="space-y-3 pb-10">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Clock className="h-4 w-4" /> Scrollable timeline
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Events flow across midnight
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[54px_1fr_1fr_54px] border-b border-slate-100 bg-slate-50 px-2 py-3 text-xs font-bold text-slate-500">
          <div>Time</div>
          <div className="flex items-center justify-center gap-1 text-center">
            <UserRound className="h-3 w-3" /> {people.you.name}
          </div>
          <div className="flex items-center justify-center gap-1 text-center">
            <UserRound className="h-3 w-3" /> {hasPartner ? people.partner.name : "Partner"}
          </div>
          <div className="text-right">{otherTimeLabel}</div>
        </div>

        <div
          ref={timelineScrollRef}
          className="max-h-[70vh] overflow-y-auto overscroll-contain"
        >
          <div
            className="relative grid grid-cols-[54px_1fr_1fr_54px] px-2"
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
              {dayDividers
                .filter((d) => d.owner === "you")
                .map((divider) => (
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
              {dayDividers
                .filter((d) => d.owner === "her")
                .map((divider) => (
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
              className="pointer-events-none absolute z-20"
              style={{
                top: nowTop,
                left: 54,
                right: 54,
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

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <Moon className="mb-1 h-4 w-4" /> Starry blocks mean asleep.
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <Sun className="mb-1 h-4 w-4" /> Green means free to talk.
        </div>
      </div>
    </section>
  );
}
