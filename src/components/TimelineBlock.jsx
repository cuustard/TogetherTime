import { memo } from "react";
import { STATUS_LABELS, STATUS_STYLES } from "../constants/availability";
import { formatTimeInZone } from "../lib/time";

function TimelineBlock({ block, onSelectEvent, people }) {
  const minHeight = Math.max(block.height, 26);
  const styleClass = STATUS_STYLES[block.type] || STATUS_STYLES.unknown;
  const showStatusLine =
    minHeight > 42 && STATUS_LABELS[block.type] !== block.label;

  const isSelectableEvent = ["one_off", "routine"].includes(block.kind) && Boolean(onSelectEvent);

  return (
    <button
      className={`absolute left-1 right-1 overflow-hidden rounded-xl border px-2 py-1 text-left text-[11px] leading-tight shadow-sm ${styleClass} ${
        block.type === "sleep" ? "isolate" : ""
      } ${isSelectableEvent ? "cursor-pointer ring-pink-300/0 active:scale-[0.99]" : "cursor-default"}`}
      style={{ top: block.top, height: minHeight }}
      title={`${block.label}: ${formatTimeInZone(block.startUtc, block.timezone || people?.[block.owner]?.homeTimeZone || "UTC")}–${formatTimeInZone(block.endUtc, block.timezone || people?.[block.owner]?.homeTimeZone || "UTC")}`}
      type="button"
      onClick={() => {
        if (isSelectableEvent) onSelectEvent(block.owner, block.id, block.kind);
      }}
    >
      {block.type === "sleep" && (
        <div className="sleep-sky-overlay" aria-hidden="true" />
      )}
      <div className="relative z-10 truncate font-semibold">{block.label}</div>
      {showStatusLine && (
        <div className="relative z-10 truncate opacity-75">
          {STATUS_LABELS[block.type]}
        </div>
      )}
    </button>
  );
}

export const MemoTimelineBlock = memo(TimelineBlock);
