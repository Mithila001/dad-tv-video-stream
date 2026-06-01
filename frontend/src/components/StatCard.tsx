import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly icon?: LucideIcon;
  readonly status?: {
    readonly label: string;
    readonly tone?: "success" | "warning" | "danger" | "accent";
  };
  readonly className?: string;
}

const statusToneClasses = {
  success: "bg-success/15 text-success ring-success/25",
  warning: "bg-warning/15 text-warning ring-warning/25",
  danger: "bg-danger/15 text-danger ring-danger/25",
  accent: "bg-accent/15 text-accent-strong ring-accent/25",
} as const;

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  status,
  className,
}: StatCardProps) {
  return (
    <article
      className={[
        "rounded-2xl border border-border bg-surface/90 p-5 shadow-panel",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            {label}
          </p>
          <p className="u-break-anywhere mt-3 text-2xl font-semibold text-text">{value}</p>
        </div>

        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-strong ring-1 ring-accent/25">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      {description ? (
        <p className="u-break-anywhere mt-2 text-sm leading-6 text-text-muted">{description}</p>
      ) : null}

      {status ? (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={[
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
              statusToneClasses[status.tone ?? "accent"],
            ].join(" ")}
          >
            {status.label}
          </span>
        </div>
      ) : null}
    </article>
  );
}
