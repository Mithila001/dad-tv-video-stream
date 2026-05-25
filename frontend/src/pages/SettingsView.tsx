import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, HelpCircle } from "lucide-react";

export interface SystemConfiguration {
  readonly tvReceiverUsername: string;
  readonly tvReceiverPassword?: string;
  readonly broadcastBaseUrl: string;
  readonly stationName: string;
}

const currentConfig: SystemConfiguration = {
  tvReceiverUsername: "tv-lobby",
  tvReceiverPassword: "tv123",
  broadcastBaseUrl: "https://stream.lobbystream.tv",
  stationName: "LobbyStream",
};

export function SettingsView() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="space-y-6 overflow-hidden">
      {/* Title & Overview Card */}
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Configuration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
          System Configuration
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted md:text-base">
          These configuration properties are loaded from the environment parameters of the active deployment.
          Values are read-only for operator verification.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        {/* Main Configuration Form */}
        <div className="space-y-4 rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                System parameters
              </p>
              <h2 className="mt-1 text-xl font-semibold text-text">
                Deployment Settings Form
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-strong ring-1 ring-accent/25">
              <ShieldCheck className="h-3.5 w-3.5" />
              Environment Managed
            </span>
          </div>

          <form className="space-y-6 pt-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Receiver Username */}
              <div className="space-y-2">
                <label
                  htmlFor="tvReceiverUsername"
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
                >
                  TV Receiver Username
                </label>
                <input
                  id="tvReceiverUsername"
                  type="text"
                  readOnly
                  value={currentConfig.tvReceiverUsername}
                  className="w-full rounded-xl border border-border bg-bg/50 px-4 py-3 text-sm text-text cursor-not-allowed outline-none focus:ring-0"
                  aria-describedby="receiver-username-helper"
                />
                <p id="receiver-username-helper" className="text-xs text-text-muted">
                  Used by display screens to establish a connection.
                </p>
              </div>

              {/* Receiver Password */}
              <div className="space-y-2">
                <label
                  htmlFor="tvReceiverPassword"
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
                >
                  TV Receiver Password
                </label>
                <div className="relative">
                  <input
                    id="tvReceiverPassword"
                    type={showPassword ? "text" : "password"}
                    readOnly
                    value={currentConfig.tvReceiverPassword}
                    className="w-full rounded-xl border border-border bg-bg/50 pl-4 pr-11 py-3 text-sm text-text cursor-not-allowed outline-none focus:ring-0"
                    aria-describedby="receiver-password-helper"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p id="receiver-password-helper" className="text-xs text-text-muted">
                  Environment credential for authentication.
                </p>
              </div>

              {/* Broadcast Base URL */}
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="broadcastBaseUrl"
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
                >
                  Broadcast Base URL
                </label>
                <input
                  id="broadcastBaseUrl"
                  type="url"
                  readOnly
                  value={currentConfig.broadcastBaseUrl}
                  className="w-full rounded-xl border border-border bg-bg/50 px-4 py-3 text-sm text-text cursor-not-allowed outline-none focus:ring-0"
                  aria-describedby="base-url-helper"
                />
                <p id="base-url-helper" className="text-xs text-text-muted">
                  The primary host origin used for media uploads and asset resolution.
                </p>
              </div>

              {/* Station Name */}
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="stationName"
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
                >
                  Station Name
                </label>
                <input
                  id="stationName"
                  type="text"
                  readOnly
                  value={currentConfig.stationName}
                  className="w-full rounded-xl border border-border bg-bg/50 px-4 py-3 text-sm text-text cursor-not-allowed outline-none focus:ring-0"
                  aria-describedby="station-name-helper"
                />
                <p id="station-name-helper" className="text-xs text-text-muted">
                  Operator and receiver identification label.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Sidebar Info Panel */}
        <aside className="space-y-4 rounded-2xl border border-border bg-surface/90 p-6 shadow-panel">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Operational Notes
            </p>
            <h2 className="mt-1 text-xl font-semibold text-text">
              Configuration Controls
            </h2>
          </div>

          <div className="space-y-4 text-sm text-text-muted">
            <div className="flex gap-3 rounded-xl border border-border/70 bg-bg/50 p-4">
              <HelpCircle className="h-5 w-5 text-accent-strong shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-text">Why are fields read-only?</p>
                <p className="mt-1 text-xs">
                  This deployment is structured as environment-controlled. Credentials and domain properties
                  are injected on container deployment rather than persisted in a mutable database store.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-border/70 bg-bg/50 p-4">
              <ShieldCheck className="h-5 w-5 text-accent-strong shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-text">Future Persisted API</p>
                <p className="mt-1 text-xs">
                  The model utilizes the strict `SystemConfiguration` interface. When a configuration write-service
                  is enabled on the backend, these form fields can be connected directly to a state mutator.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}