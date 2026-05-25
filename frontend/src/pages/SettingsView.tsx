const readOnlySettings = [
  {
    label: "TV receiver username",
    value: "tv-lobby",
    helper: "Matches the existing receiver login flow.",
  },
  {
    label: "TV receiver password",
    value: "tv123",
    helper: "Deployment-managed credential for the display receiver.",
  },
  {
    label: "Broadcast base URL",
    value: "https://stream.lobbystream.tv",
    helper: "Primary origin used for stream delivery.",
  },
  {
    label: "Station name",
    value: "LobbyStream",
    helper: "Shown on operator and receiver screens.",
  },
];

export function SettingsView() {
  return (
    <section className="space-y-6 overflow-hidden">
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
          System Configuration
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
          These values are shown as operational settings for the current deployment.
          In this phase they are read-only, so operators can verify the receiver
          credentials and stream metadata without changing environment-managed data.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Receiver Access
              </p>
              <h2 className="mt-1 text-xl font-semibold text-text">
                TV display login details
              </h2>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-strong ring-1 ring-accent/25">
              Read only
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {readOnlySettings.map((setting) => (
              <div
                key={setting.label}
                className="overflow-hidden rounded-2xl border border-border/70 bg-bg/70 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {setting.label}
                </p>
                <p className="mt-2 truncate text-base font-semibold text-text">
                  {setting.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {setting.helper}
                </p>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Broadcast Metadata
            </p>
            <h2 className="mt-1 text-xl font-semibold text-text">
              Stream verification panel
            </h2>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-bg/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Streaming performance panel
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Keep this area focused on operational checks such as URL targets,
                receiver access, and station labels. No layout-breaking controls
                or editable config state are introduced yet.
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-bg/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Future API hook
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                When a persistent config service is added later, this page can
                be wired to backend reads and writes without changing the page
                layout or labels.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}