import { ArrowDown, ArrowUp, Play, Trash2, Radio } from "lucide-react";
import { useSharedStreamSocket } from "../context/StreamSocketContext";
import { StreamNowPanel } from "./StreamNowPanel";

export interface LiveQueuePanelProps {
  readonly streamVariant?: "console" | "player";
  readonly className?: string;
}

export function LiveQueuePanel({
  streamVariant = "player",
  className,
}: LiveQueuePanelProps) {
  const {
    liveQueue,
    assets,
    reorderQueue,
    deleteQueueItem,
    jumpToQueueItem,
  } = useSharedStreamSocket();

  const playingItem = liveQueue.find((item) => item.status === "playing");
  const upcomingItems = liveQueue.filter((item) => item.status === "upcoming");

  const handleMoveUp = async (index: number) => {
    // Find the item's index in the full liveQueue array
    const itemToMove = upcomingItems[index];
    const fullIndex = liveQueue.findIndex((item) => item.id === itemToMove.id);
    if (fullIndex <= 0) {
      return;
    }

    const nextOrder = [...liveQueue];
    const temporary = nextOrder[fullIndex];
    nextOrder[fullIndex] = nextOrder[fullIndex - 1];
    nextOrder[fullIndex - 1] = temporary;

    try {
      await reorderQueue(nextOrder.map((item) => item.id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleMoveDown = async (index: number) => {
    const itemToMove = upcomingItems[index];
    const fullIndex = liveQueue.findIndex((item) => item.id === itemToMove.id);
    if (fullIndex === -1 || fullIndex >= liveQueue.length - 1) {
      return;
    }

    const nextOrder = [...liveQueue];
    const temporary = nextOrder[fullIndex];
    nextOrder[fullIndex] = nextOrder[fullIndex + 1];
    nextOrder[fullIndex + 1] = temporary;

    try {
      await reorderQueue(nextOrder.map((item) => item.id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteQueueItem(itemId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleJump = async (itemId: string) => {
    try {
      await jumpToQueueItem(itemId);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <article
      className={[
        "flex flex-col rounded-2xl border border-border bg-surface/90 p-6 shadow-panel overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <StreamNowPanel
        playlist={assets}
        variant={streamVariant}
        className="border-0 bg-transparent shadow-none"
      />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Broadcast Queue
        </p>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text-muted ring-1 ring-border/70">
          {liveQueue.length} staged
        </span>
      </div>

      {playingItem && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="h-4.5 w-4.5 text-success animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">
              Currently Playing
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-success/35 bg-success/10 p-3 ring-1 ring-success/25">
            <img
              src={playingItem.thumbnailUrl}
              alt={playingItem.title}
              className="h-14 w-14 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">
                {playingItem.title}
              </p>
              <p className="text-sm text-success font-medium">Playing now</p>
            </div>
            <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-success ring-1 ring-success/20">
              Live
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 flex-1 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted mb-3">
          Upcoming Broadcasts
        </p>

        {upcomingItems.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-bg/50 text-sm text-text-muted">
            No upcoming videos queued
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingItems.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === upcomingItems.length - 1;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-bg/70 p-3 hover:border-accent/35 transition-colors group"
                >
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="h-12 w-12 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {item.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      Starts in {item.startsInMinutes ?? 0}m
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleJump(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-success/15 hover:text-success transition-colors"
                      title="Jump to this video"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={isFirst}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-accent/15 hover:text-accent-strong disabled:opacity-40 transition-colors"
                      title="Move Up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={isLast}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-accent/15 hover:text-accent-strong disabled:opacity-40 transition-colors"
                      title="Move Down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                      title="Remove from queue"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
