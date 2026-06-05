import { ArrowDown, ArrowUp, Play, Trash2, Radio } from "lucide-react";
import { useSharedStreamSocket } from "../context/StreamSocketContext";
import { StreamNowPanel } from "../components/StreamNowPanel";

export function LiveQueueView() {
  const {
    liveQueue,
    assets,
    reorderQueue,
    deleteQueueItem,
    jumpToQueueItem,
    connectionState,
  } = useSharedStreamSocket();

  const playingItem = liveQueue.find((item) => item.status === "playing");
  const upcomingItems = liveQueue.filter((item) => item.status === "upcoming");

  const handleMoveUp = async (index: number) => {
    const itemToMove = upcomingItems[index];
    const fullIndex = liveQueue.findIndex((item) => item.id === itemToMove.id);
    if (fullIndex <= 0) return;
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
    if (fullIndex === -1 || fullIndex >= liveQueue.length - 1) return;
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
    <section className="space-y-6 overflow-hidden">
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Live Control
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
          Live Queue
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
          Monitor and control the live broadcast queue. Reorder upcoming videos,
          skip to any item, or remove items from the sequence.
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Streaming Status:{" "}
          <span className={connectionState === "connected" ? "text-success" : "text-text-muted"}>
            {connectionState === "connected" ? "Live" : connectionState}
          </span>
          {" "}• {liveQueue.length} items staged
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div className="rounded-2xl border border-border bg-surface/90 shadow-panel overflow-hidden">
          <div className="p-6 border-b border-border/60">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Broadcast Console
            </p>
            <h2 className="mt-1 text-xl font-semibold text-text">
              Stream Controls
            </h2>
          </div>
          <StreamNowPanel
            playlist={assets}
            variant="console"
            className="border-0 shadow-none rounded-none"
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Broadcast Queue
              </p>
              <h2 className="mt-1 text-xl font-semibold text-text">
                Upcoming Videos
              </h2>
            </div>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text-muted ring-1 ring-border/70">
              {liveQueue.length} staged
            </span>
          </div>

          {playingItem && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="h-4 w-4 text-success animate-pulse" />
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

          <div className="flex-1 overflow-y-auto">
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
                      className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-bg/70 p-3 transition-colors hover:border-accent/35"
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
                      <div className="shrink-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleJump(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-success/15 hover:text-success transition-colors"
                          title="Play this video now"
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
        </div>
      </div>
    </section>
  );
}