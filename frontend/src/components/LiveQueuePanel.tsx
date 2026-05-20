import {
  liveQueueSequence,
  type LiveQueueItem,
  type VideoAsset,
} from "../data/mockData";
import { StreamNowPanel } from "./StreamNowPanel";

export interface LiveQueuePanelProps {
  readonly items?: ReadonlyArray<LiveQueueItem>;
  readonly playlist?: ReadonlyArray<VideoAsset>;
  readonly streamVariant?: "console" | "player";
  readonly className?: string;
}

export function LiveQueuePanel({
  items = liveQueueSequence,
  playlist = [],
  streamVariant = "player",
  className,
}: LiveQueuePanelProps) {
  return (
    <article
      className={[
        "rounded-2xl border border-border bg-surface/90 p-6 shadow-panel",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <StreamNowPanel
        playlist={playlist}
        variant={streamVariant}
        className="border-0 bg-transparent shadow-none"
      />

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
        Live Queue Snapshot
      </p>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const isPlaying = item.status === "playing";

          return (
            <div
              key={item.id}
              className={[
                "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                isPlaying
                  ? "border-success/35 bg-success/10 ring-1 ring-success/25"
                  : "border-border/70 bg-bg/70 hover:border-accent/35",
              ].join(" ")}
            >
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="h-14 w-14 rounded-lg object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">
                      {item.title}
                    </p>
                    <p className="text-sm text-text-muted">
                      {isPlaying
                        ? "Playing now"
                        : `Starts in ${item.startsInMinutes ?? 0}m`}
                    </p>
                  </div>

                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1",
                      isPlaying
                        ? "bg-success/15 text-success ring-success/25"
                        : "bg-surface-2 text-text-muted ring-border/70",
                    ].join(" ")}
                  >
                    {isPlaying ? "Playing Now" : "Upcoming"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
