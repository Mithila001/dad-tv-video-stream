import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { UploadVideoPayload } from "../services/api";

const stagedVideoChoices = [
  {
    label: "video_1.mp4",
    value: "/videos/video_1.mp4",
  },
  {
    label: "video_2.mp4",
    value: "/videos/video_2.mp4",
  },
] as const;

export interface UploadVideoModalProps {
  readonly open: boolean;
  readonly loading?: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (payload: UploadVideoPayload) => Promise<void>;
}

export function UploadVideoModal({
  open,
  loading = false,
  onClose,
  onSubmit,
}: UploadVideoModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Broadcast");
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [videoUrl, setVideoUrl] = useState<
    (typeof stagedVideoChoices)[number]["value"]
  >(stagedVideoChoices[0].value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);

          try {
            await onSubmit({
              title: title.trim(),
              category: category.trim(),
              durationSeconds,
              videoUrl,
            });

            setTitle("");
            setCategory("Broadcast");
            setDurationSeconds(60);
            setVideoUrl(stagedVideoChoices[0].value);
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : "Unable to upload asset",
            );
          }
        }}
        className="relative z-10 w-full max-w-xl rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Upload Video
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-text">
              Add a new broadcast asset
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-surface-2 p-2 text-text-muted transition hover:text-text"
            aria-label="Close upload modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-text">
            Video Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              type="text"
              required
              placeholder="E.g. New Lobby Loop"
              className="rounded-xl border border-border bg-bg px-4 py-3 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-text">
            Category
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              type="text"
              required
              placeholder="Broadcast"
              className="rounded-xl border border-border bg-bg px-4 py-3 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-text">
            Duration (seconds)
            <input
              value={durationSeconds}
              onChange={(event) =>
                setDurationSeconds(Number(event.target.value))
              }
              type="number"
              min={1}
              step={1}
              required
              className="rounded-xl border border-border bg-bg px-4 py-3 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-text">
            Source File
            <select
              value={videoUrl}
              onChange={(event) =>
                setVideoUrl(
                  event.target
                    .value as (typeof stagedVideoChoices)[number]["value"],
                )
              }
              className="rounded-xl border border-border bg-bg px-4 py-3 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            >
              {stagedVideoChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-text transition hover:border-accent/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Uploading..." : "Upload Video"}
          </button>
        </div>
      </form>
    </div>
  );
}
