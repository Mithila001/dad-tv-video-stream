import { useEffect, useState } from "react";
import { Clock3, Gauge, PencilLine, Trash2, Tv2 } from "lucide-react";
import { LiveQueuePanel } from "../components/LiveQueuePanel";
import { RoleGate } from "../components/RoleGate";
import { StatCard } from "../components/StatCard";
import {
  type LiveQueueItem,
  type VideoAsset,
  fetchLiveQueue,
  fetchStreamSync,
  fetchVideoLibrary,
} from "../services/api";

export interface DashboardProps {
  readonly className?: string;
}

export function Dashboard({ className }: DashboardProps) {
  const [videoLibrary, setVideoLibrary] = useState<ReadonlyArray<VideoAsset>>(
    [],
  );
  const [liveQueue, setLiveQueue] = useState<ReadonlyArray<LiveQueueItem>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let queuePollTimerId: number | null = null;

    async function loadDashboardData() {
      setIsLoading(true);

      const [videos, queue] = await Promise.all([
        fetchVideoLibrary(),
        fetchLiveQueue(),
      ]);

      if (!isActive) {
        return;
      }

      setVideoLibrary(videos);
      setLiveQueue(queue);
      setIsLoading(false);
    }

    async function refreshRealtimeStreamData() {
      const [, queue] = await Promise.all([
        fetchStreamSync(),
        fetchLiveQueue(),
      ]);

      if (!isActive) {
        return;
      }

      setLiveQueue(queue);
    }

    void loadDashboardData();
    queueMicrotask(() => {
      void refreshRealtimeStreamData();
    });

    const handleDataUpdated = () => {
      void loadDashboardData();
      void refreshRealtimeStreamData();
    };

    window.addEventListener("lobbystream:data-updated", handleDataUpdated);

    queuePollTimerId = window.setInterval(() => {
      void refreshRealtimeStreamData();
    }, 4000);

    return () => {
      isActive = false;
      if (queuePollTimerId) {
        window.clearInterval(queuePollTimerId);
      }
      window.removeEventListener("lobbystream:data-updated", handleDataUpdated);
    };
  }, []);

  const featuredVideo = videoLibrary[0];

  return (
    <div className={["space-y-6", className].filter(Boolean).join(" ")}>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            Overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text md:text-4xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
            Monitor the LobbyStream media pipeline, keep the live queue in
            order, and move assets through the admin workflow from one place.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            Broadcast Status
          </p>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-2/70 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text">Main Channel</p>
                <p className="text-sm text-text-muted">
                  HD 1080p stream active
                </p>
              </div>
              <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/25">
                Playing Now
              </span>
            </div>

            <div className="rounded-xl border border-border/70 bg-bg/70 px-4 py-3">
              <p className="text-sm font-semibold text-text">
                Network Operator
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Ready to upload, schedule, and route media assets.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total assets"
          value={`${videoLibrary.length}`}
          description="Videos ready for scheduling and playback"
          icon={Tv2}
        />
        <StatCard
          label="Live queue"
          value={`${liveQueue.length}`}
          description="Items currently staged in the broadcast sequence"
          icon={Gauge}
          status={{ label: "Healthy", tone: "success" }}
        />
        <StatCard
          label="Latest upload"
          value={featuredVideo?.uploadDate ?? "N/A"}
          description={featuredVideo?.title ?? "No media found"}
          icon={Clock3}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <article className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Featured Asset
              </p>
              <h2 className="mt-1 text-xl font-semibold text-text">
                {isLoading ? "Loading dashboard data..." : featuredVideo?.title}
              </h2>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-strong ring-1 ring-accent/25">
              {featuredVideo?.format ?? "--"}
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border/70 bg-bg">
            {featuredVideo ? (
              <img
                src={featuredVideo.thumbnailUrl}
                alt={featuredVideo.title}
                className="h-56 w-full object-cover md:h-72"
              />
            ) : (
              <div className="flex h-56 w-full items-center justify-center text-sm text-text-muted md:h-72">
                {isLoading
                  ? "Loading preview..."
                  : "No featured video available"}
              </div>
            )}
          </div>

          <dl className="mt-5 grid gap-3 text-sm text-text-muted sm:grid-cols-2">
            <div className="rounded-xl bg-surface-2/60 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Duration
              </dt>
              <dd className="mt-1 text-text">
                {featuredVideo?.duration ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-2/60 px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Size
              </dt>
              <dd className="mt-1 text-text">{featuredVideo?.size ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <LiveQueuePanel
          items={liveQueue}
          playlist={videoLibrary}
          streamVariant="console"
          className="p-5"
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Video Asset Cards
            </p>
            <h2 className="mt-1 text-xl font-semibold text-text">
              Manage uploads and editorial actions
            </h2>
          </div>
          <p className="text-sm text-text-muted">
            Edit/delete is reserved for Network Operators.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {videoLibrary.slice(0, 3).map((video) => (
            <article
              key={video.id}
              className="overflow-hidden rounded-2xl border border-border/70 bg-bg/80"
            >
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-40 w-full object-cover"
              />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-text">
                      {video.title}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {video.duration} • {video.size} • {video.format}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong ring-1 ring-accent/25">
                    {video.uploadDate}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <RoleGate
                    allowedRoles={["Network Operator"]}
                    mode="disable"
                    fallback={
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-text-muted opacity-60"
                        aria-label={`Edit ${video.title} requires Network Operator access`}
                      >
                        <PencilLine className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </button>
                    }
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-text transition hover:border-accent/50 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <PencilLine className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </button>
                  </RoleGate>

                  <RoleGate
                    allowedRoles={["Network Operator"]}
                    mode="disable"
                    fallback={
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-text-muted opacity-60"
                        aria-label={`Delete ${video.title} requires Network Operator access`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    }
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-danger/35 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition hover:border-danger/50 hover:bg-danger/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  </RoleGate>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
