import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Fullscreen,
  Maximize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import type { VideoAsset } from '../data/mockData'

export interface StreamNowPanelProps {
  readonly playlist: ReadonlyArray<VideoAsset>
  readonly className?: string
}

export function StreamNowPanel({ playlist, className }: StreamNowPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const currentVideo = playlist[currentIndex]
  const canSkipPrevious = currentIndex > 0
  const canSkipNext = currentIndex < playlist.length - 1

  const videoSource = useMemo(() => currentVideo?.videoUrl, [currentVideo])

  useEffect(() => {
    const videoElement = videoRef.current

    if (!videoElement) {
      return
    }

    if (isPlaying) {
      void videoElement.play().catch(() => undefined)
      return
    }

    videoElement.pause()
  }, [isPlaying, videoSource])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleSkipPrevious = () => {
    if (!canSkipPrevious) {
      return
    }

    setCurrentIndex((value) => Math.max(0, value - 1))
  }

  const handleSkipNext = () => {
    if (!canSkipNext) {
      return
    }

    setCurrentIndex((value) => Math.min(playlist.length - 1, value + 1))
  }

  const handleTogglePlay = () => {
    setIsPlaying((value) => !value)
  }

  const handleFullscreen = async () => {
    const videoElement = videoRef.current

    if (!videoElement) {
      return
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await videoElement.parentElement?.requestFullscreen()
  }

  return (
    <section
      className={[
        'overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-panel',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Playing Now
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text">
            {currentVideo?.title ?? 'No active stream'}
          </h3>
        </div>

        <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/25">
          {currentVideo?.format ?? 'LIVE'}
        </span>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)]">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-bg">
          {videoSource ? (
            <video
              ref={videoRef}
              src={videoSource}
              className="h-full min-h-70 w-full bg-black object-cover"
              autoPlay
              muted
              playsInline
              loop={false}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="flex min-h-70 w-full items-center justify-center text-sm text-text-muted">
              No playable media source available
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-bg/70 p-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Stream Details
              </p>
              <p className="mt-2 text-sm font-semibold text-text">
                {currentVideo?.title ?? 'Unknown asset'}
              </p>
              <p className="text-sm text-text-muted">
                {currentVideo
                  ? `${currentVideo.duration} • ${currentVideo.size}`
                  : 'Waiting for media source'}
              </p>
            </div>

            <div className="grid gap-2 text-sm text-text-muted">
              <div className="rounded-xl bg-surface-2/60 px-3 py-2">
                Active source: {videoSource ? 'Local MP4 asset' : 'Unavailable'}
              </div>
              <div className="rounded-xl bg-surface-2/60 px-3 py-2">
                Playback: {isPlaying ? 'Playing' : 'Paused'}
              </div>
              <div className="rounded-xl bg-surface-2/60 px-3 py-2">
                Fullscreen: {isFullscreen ? 'Enabled' : 'Off'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={handleSkipPrevious}
              disabled={!canSkipPrevious}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-3 py-3 text-text transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Skip previous"
            >
              <SkipBack className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center justify-center rounded-xl bg-accent px-3 py-3 text-bg transition hover:bg-accent-strong"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={handleSkipNext}
              disabled={!canSkipNext}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-3 py-3 text-text transition hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Skip next"
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleFullscreen}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-3 py-3 text-text transition hover:border-accent/50"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Maximize className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Fullscreen className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}