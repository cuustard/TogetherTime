import { memo } from "react";
import { STATUS_STYLES } from "../constants/availability";
import { PEOPLE } from "../data/people";
import { Card, CardContent } from "./Card";

function PersonStatus({ personKey, status, time, viewer }) {
  const person = PEOPLE[personKey];
  const styleClass = STATUS_STYLES[status.type] || STATUS_STYLES.unknown;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <span>{person.emoji}</span>
          <span>{person.name}</span>
          {viewer === personKey && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
              me
            </span>
          )}
        </div>
        <div className="text-2xl font-bold tracking-tight">{time}</div>
      </div>
      <div
        className={`rounded-2xl border px-3 py-2 text-right text-xs font-semibold ${styleClass}`}
      >
        {status.label}
      </div>
    </div>
  );
}

const MemoPersonStatus = memo(PersonStatus);

function CombinedPersonStatus({
  you,
  youTime,
  partner,
  partnerTime,
  viewer,
  timeDifferenceLabel,
}) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          <MemoPersonStatus
            personKey="you"
            status={you}
            time={youTime}
            viewer={viewer}
          />

          <div className="relative -mx-4 flex items-center gap-2">
            <div className="flex-1 border-t border-slate-100" />
            <div className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-0.5 text-xs font-medium tracking-wide text-slate-500">
              {timeDifferenceLabel}
            </div>
            <div className="flex-1 border-t border-slate-100" />
          </div>

          <MemoPersonStatus
            personKey="partner"
            status={partner}
            time={partnerTime}
            viewer={viewer}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export const MemoCombinedPersonStatus = memo(CombinedPersonStatus);
