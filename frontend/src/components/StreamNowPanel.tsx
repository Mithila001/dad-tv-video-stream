import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Fullscreen,
  Maximize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'
import type { VideoAsset } from '../services/api'
import {
  fetchStreamSync,
  sendStreamControl,
  type StreamControlCommand,
  type StreamSyncResponse,
} from '../services/api'

export interface StreamNowPanelProps {
  readonly playlist: ReadonlyArray<VideoAsset>
  readonly className?: string
  readonly variant?: 'console' | 'player'
}

function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function StreamNowPanel({
  playlist,
  className,
  variant = 'player',
}: StreamNowPanelProps) {
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)
  const [fallbackVideoUrl, setFallbackVideoUrl] = useState<string | null>(null)
  const [syncTargetTime, setSyncTargetTime] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [hasConnectedAudio, setHasConnectedAudio] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const syncPollTimerRef = useRef<number | null>(null)

  const currentVideo = useMemo(
    () => playlist.find((video) => video.id === currentVideoId) ?? playlist[0],
    [currentVideoId, playlist],
  )

  const videoSource = useMemo(
    () => currentVideo?.videoUrl ?? fallbackVideoUrl ?? undefined,
    [currentVideo, fallbackVideoUrl],
  )

  const applySyncState = useCallback((syncState: StreamSyncResponse) => {
    setCurrentVideoId(syncState.videoId)
    setFallbackVideoUrl(syncState.videoUrl)
    setSyncTargetTime(syncState.currentTime)
    setDurationSeconds(Math.max(1, syncState.durationSeconds))
    setIsPlaying(syncState.isPlaying)
  }, [])

  const syncFromServer = useCallback(async () => {
    try {
      const syncState = await fetchStreamSync()
      applySyncState(syncState)
    } catch {
      // Keep local playback running until sync endpoint responds again.
    }
  }, [applySyncState])

  const runControlCommand = useCallback(
    (command: StreamControlCommand) => {
      void sendStreamControl(command)
        .then((syncState) => {
          applySyncState(syncState)
        })
        .catch(() => undefined)
    },
    [applySyncState],
  )

  useEffect(() => {
    queueMicrotask(() => {
      void syncFromServer()
    })

    syncPollTimerRef.current = window.setInterval(() => {
      void syncFromServer()
    }, 4000)

    const handleVisibilityOrFocus = () => {
      void syncFromServer()
      if (variant === 'player') {
        void videoRef.current?.play().catch(() => undefined)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)

    return () => {
      if (syncPollTimerRef.current) {
        window.clearInterval(syncPollTimerRef.current)
      }

      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
    }
  }, [syncFromServer, variant])

  useEffect(() => {
    if (variant !== 'player') {
      return
    }

    const videoElement = videoRef.current

    if (!videoElement) {
      return
    }

    if (isPlaying) {
      void videoElement.play().catch(() => undefined)
      return
    }

    videoElement.pause()
  }, [isPlaying, variant, videoSource])

  useEffect(() => {
    if (variant !== 'player') {
      return
    }

    const videoElement = videoRef.current

    if (!videoElement || !videoSource) {
      return
    }

    const handleLoadedMetadata = () => {
      const targetTime = Math.max(0, syncTargetTime)
      const safeTargetTime = Math.min(
        targetTime,
        Math.max(0, videoElement.duration - 0.25),
      )

      videoElement.currentTime = safeTargetTime
      if (isPlaying) {
        void videoElement.play().catch(() => undefined)
        return
      }

      videoElement.pause()
    }

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [isPlaying, syncTargetTime, variant, videoSource])

  useEffect(() => {
    if (variant !== 'player') {
      return
    }

    const videoElement = videoRef.current

    if (!videoElement) {
      return
    }

    const driftSeconds = Math.abs(videoElement.currentTime - syncTargetTime)
    if (driftSeconds > 1.2) {
      videoElement.currentTime = syncTargetTime
    }
  }, [syncTargetTime, variant])

  useEffect(() => {
    if (variant !== 'player') {
      return
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [variant])

  useEffect(() => {
    if (variant !== 'player') {
      return
    }

    const handleSpacebarToggle = (event: KeyboardEvent) => {
      if (event.code !== 'Space') {
        return
      }

      if (
        event.target instanceof HTMLElement &&
        (event.target.tagName === 'INPUT' ||
          event.target.tagName === 'TEXTAREA' ||
          event.target.isContentEditable)
      ) {
        return
      }

      event.preventDefault()
      runControlCommand(isPlaying ? 'pause' : 'play')
    }

    window.addEventListener('keydown', handleSpacebarToggle)
    return () => {
      window.removeEventListener('keydown', handleSpacebarToggle)
    }
  }, [isPlaying, runControlCommand, variant])

  const handleTogglePlay = () => {
    runControlCommand(isPlaying ? 'pause' : 'play')
  }

  const handleSkipNext = () => {
    runControlCommand('next')
  }

  const handleSkipPrevious = () => {
    runControlCommand('previous')
  }

  const handleConnectAudio = async () => {
    const videoElement = videoRef.current

    if (!videoElement) {
      return
    }

    videoElement.muted = false
    setIsMuted(false)
    setHasConnectedAudio(true)
    await videoElement.play().catch(() => undefined)
  }

  const handleFullscreen = async () => {
    const videoElement = videoRef.current

    if (!videoElement || variant !== 'player') {
      return
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await videoElement.parentElement?.requestFullscreen()
  }

  const progressPercent = Math.min(100, (syncTargetTime / durationSeconds) * 100)

  const controlButtons = (
    <div className="grid grid-cols-4 gap-2">
      <button
        type="button"
        onClick={handleSkipPrevious}
        className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-3 py-3 text-text transition hover:border-accent/50"
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
        className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-3 py-3 text-text transition hover:border-accent/50"
        aria-label="Skip next"
      >
        <SkipForward className="h-4 w-4" aria-hidden="true" />
      </button>
      {variant === 'player' ? (
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
      ) : (
        <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-success">
          {isPlaying ? 'On Air' : 'Paused'}
        </div>
      )}
    </div>
  )

  if (variant === 'console') {
    return (
      <section
        className={[
          'overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-panel',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="border-b border-border/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Broadcast Console
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text">
            {currentVideo?.title ?? 'No active stream'}
          </h3>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl border border-border/70 bg-bg/60 p-4">
            <div className="mb-3 flex items-center justify-between text-sm font-medium text-text-muted">
              <span>Playback timeline</span>
              <span>
                {formatClock(syncTargetTime)} / {formatClock(durationSeconds)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid gap-2 text-sm text-text-muted sm:grid-cols-3">
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              Status: {isPlaying ? 'Playing' : 'Paused'}
            </div>
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              Source: {currentVideo?.format ?? 'LIVE'}
            </div>
            <div className="rounded-xl bg-surface-2/60 px-3 py-2">
              Runtime: {formatClock(syncTargetTime)}
            </div>
          </div>

          {controlButtons}
        </div>
      </section>
    )
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
            <div className="relative">
              <video
                ref={videoRef}
                src={videoSource}
                className="h-full min-h-70 w-full bg-black object-cover"
                autoPlay
                muted
                playsInline
                loop={false}
                onVolumeChange={() => setIsMuted(Boolean(videoRef.current?.muted))}
              />

              {isMuted && (
                <div className="absolute inset-0 flex items-end justify-center bg-black/30 p-4">
                  <button
                    type="button"
                    onClick={() => void handleConnectAudio()}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-bg shadow-lg transition hover:bg-accent-strong"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                    Click to Unmute &amp; Connect to Stream
                  </button>
                </div>
              )}
            </div>
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
                Playback: {isPlaying ? 'Playing' : 'Paused'}
              </div>
              <div className="rounded-xl bg-surface-2/60 px-3 py-2">
                Audio:{' '}
                {hasConnectedAudio && !isMuted
                  ? 'Unmuted'
                  : 'Muted (autoplay-safe)'}
              </div>
              <div className="rounded-xl bg-surface-2/60 px-3 py-2">
                Runtime: {formatClock(syncTargetTime)}
              </div>
            </div>
          </div>

          {controlButtons}
        </div>
      </div>
    </section>
  )
}
