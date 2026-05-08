import { memo } from "react";
import { Heart } from "lucide-react";
import { PEOPLE } from "../data/people";
import { formatDayInZone, formatDurationUntil, formatTimeInZone } from "../lib/time";

function OverlapCard({ window, viewerTimeZone, now, isFirst }) {
  const youTimeZone = PEOPLE.you.homeTimeZone;
  const partnerTimeZone = PEOPLE.partner.homeTimeZone;
  const startsInLabel = formatDurationUntil(window.startDate, now);

  return (
    <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm font-bold text-slate-950">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          {window.best ? "Best call window" : "Possible call window"}
        </div>

        {isFirst && (
          <div className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-700">
            {startsInLabel}
          </div>
        )}
      </div>
      <div className="text-2xl font-black tracking-tight text-slate-950">
        {formatTimeInZone(window.startDate, viewerTimeZone)}–
        {formatTimeInZone(window.endDate, viewerTimeZone)}
      </div>
      <div className="mt-1 text-sm text-slate-500">
        {formatDayInZone(window.startDate, viewerTimeZone)} in this device's
        local time
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="font-semibold text-slate-500">UK time</div>
          <div className="font-bold text-slate-950">
            {formatTimeInZone(window.startDate, youTimeZone)}–
            {formatTimeInZone(window.endDate, youTimeZone)}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <div className="font-semibold text-slate-500">Brisbane time</div>
          <div className="font-bold text-slate-950">
            {formatTimeInZone(window.startDate, partnerTimeZone)}–
            {formatTimeInZone(window.endDate, partnerTimeZone)}
          </div>
        </div>
      </div>
    </div>
  );
}

export const MemoOverlapCard = memo(OverlapCard);
