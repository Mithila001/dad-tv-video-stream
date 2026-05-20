import { StreamNowPanel } from '../components/StreamNowPanel'
import { videoLibrary } from '../data/mockData'

export function TvDisplay() {
  const playlist = videoLibrary.filter((video) => Boolean(video.videoUrl))

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-text sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center">
        <StreamNowPanel
          playlist={playlist}
          variant="player"
          className="h-full w-full border-border/70 bg-surface/90"
        />
      </div>
    </main>
  )
}