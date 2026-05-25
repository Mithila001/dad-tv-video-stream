import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { UploadVideoPayload } from "../services/api";

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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function deriveTitleFromFileName(fileName: string) {
    return fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  const selectedFilePreview = useMemo(() => {
    if (!file) {
      return null;
    }

    return {
      name: file.name,
      sizeMb: (file.size / (1024 * 1024)).toFixed(2),
      type: file.type || "video",
    };
  }, [file]);

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

          if (!file) {
            setError("Choose a video file before uploading.");
            return;
          }

          try {
            await onSubmit({
              title: title.trim(),
              file,
            });

            setTitle("");
            setFile(null);
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
            Video File
            <input
              type="file"
              accept="video/*"
              required
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);

                if (nextFile) {
                  setTitle(deriveTitleFromFileName(nextFile.name));
                }
              }}
              className="rounded-xl border border-border bg-bg px-4 py-3 text-text outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-bg hover:file:bg-accent-strong focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          {selectedFilePreview ? (
            <div className="rounded-xl border border-border/70 bg-surface-2/50 px-4 py-3 text-sm text-text-muted">
              <p className="font-semibold text-text">Selected file</p>
              <p className="mt-1 truncate">{selectedFilePreview.name}</p>
              <p className="mt-1">
                {selectedFilePreview.type} • {selectedFilePreview.sizeMb} MB
              </p>
            </div>
          ) : null}

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
