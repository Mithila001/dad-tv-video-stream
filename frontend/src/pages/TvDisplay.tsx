import { useEffect, useState } from "react";
import { StreamNowPanel } from "../components/StreamNowPanel";
import { fetchVideoLibrary, type VideoAsset } from "../services/api";

export function TvDisplay() {
  const [playlist, setPlaylist] = useState<ReadonlyArray<VideoAsset>>([]);

  useEffect(() => {
    let isActive = true;

    void fetchVideoLibrary().then((videos) => {
      if (isActive) {
        setPlaylist(videos.filter((video) => Boolean(video.videoUrl)));
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

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
  );
}
