import { memo } from "react";
import { STATUS_STYLES } from "../constants/availability";
import { Card, CardContent } from "./Card";

function PersonStatus({ personKey, person, status, date, time, viewer }) {
  const styleClass = STATUS_STYLES[status.type] || STATUS_STYLES.unknown;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <span>{person.emoji}</span>
          <span>{person.name}</span>
          {viewer === personKey && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
              me
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold tracking-tight">{time}</div>
          <div className="text-xs text-slate-400">[{date}]</div>
        </div>
      </div>
      <div
        className={`rounded-2xl border px-2 py-1 text-right text-xs font-semibold ${styleClass}`}
      >
        {status.label}
      </div>
    </div>
  );
}

const MemoPersonStatus = memo(PersonStatus);

function WaitingForPartner({ inviteCode }) {
  return (
    <div className="rounded-2xl bg-pink-50 px-3 py-3">
      <div className="text-sm font-black text-pink-800">
        Waiting for partner
      </div>
      <div className="mt-1 text-xs font-semibold text-pink-700/80">
        Share invite code{" "}
        {inviteCode ? (
          <span className="font-black">{inviteCode}</span>
        ) : (
          "from the header"
        )}{" "}
        so they can join this timeline.
      </div>
    </div>
  );
}

function CombinedPersonStatus({
  you,
  youDate,
  youTime,
  partner,
  partnerDate,
  partnerTime,
  viewer,
  timeDifferenceLabel,
  people,
  hasPartner,
  inviteCode,
}) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-sm">
      <CardContent className="p-3">
        <div className="space-y-3">
          <MemoPersonStatus
            personKey="you"
            person={people.you}
            status={you}
            date={youDate}
            time={youTime}
            viewer={viewer}
          />

          {hasPartner ? (
            <>
              <div className="relative -mx-4 flex items-center gap-2">
                <div className="flex-1 border-t border-slate-100" />
                <div className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-0.5 text-xs font-medium tracking-wide text-slate-500">
                  {timeDifferenceLabel}
                </div>
                <div className="flex-1 border-t border-slate-100" />
              </div>

              <MemoPersonStatus
                personKey="partner"
                person={people.partner}
                status={partner}
                date={partnerDate}
                time={partnerTime}
                viewer={viewer}
              />
            </>
          ) : (
            <WaitingForPartner inviteCode={inviteCode} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const MemoCombinedPersonStatus = memo(CombinedPersonStatus);
