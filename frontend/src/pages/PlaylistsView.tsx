const playlistGroups = [
  {
    title: "Lobby Ambient Loops",
    description:
      "Calm motion backgrounds used for waiting areas and ambient channel filler.",
    items: [
      "Ethereal Highlands 4K",
      "Northern Lights Skyward",
      "Alpine Reflection 8K",
    ],
    status: "Ready for sequencing",
  },
  {
    title: "Morning Broadcast Ads",
    description:
      "Operational ad breaks and branded inserts for the early broadcast block.",
    items: ["Cybernetic Flow Loop", "Rainforest Canopy Drone"],
    status: "Needs schedule review",
  },
];

export function PlaylistsView() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Playlists
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
          Operational Collections
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
          Manage grouped loops and broadcast bundles here. These placeholders
          define the structure for future sequence editing, scheduling, and
          drag-and-drop ordering.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {playlistGroups.map((group) => (
          <article
            key={group.title}
            className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-text">
                  {group.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {group.description}
                </p>
              </div>
              <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/25">
                {group.status}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {group.items.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-bg/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-text">{item}</p>
                    <p className="text-sm text-text-muted">
                      Sequence placeholder #{index + 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ring-border/70">
                      Loop
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                className="rounded-xl border border-border bg-surface-2 px-3 py-3 text-sm font-semibold text-text transition hover:border-accent/50"
              >
                Add Video
              </button>
              <button
                type="button"
                className="rounded-xl border border-border bg-surface-2 px-3 py-3 text-sm font-semibold text-text transition hover:border-accent/50"
              >
                Reorder
              </button>
              <button
                type="button"
                className="rounded-xl border border-border bg-surface-2 px-3 py-3 text-sm font-semibold text-text transition hover:border-accent/50"
              >
                Schedule
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
