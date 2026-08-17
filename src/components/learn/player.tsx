"use client";

import { useEffect, useRef } from "react";
import { saveProgress, markComplete } from "@/app/learn/actions";

type Provider = "YOUTUBE" | "VIMEO";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: any;
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.id = id;
    s.async = true;
    s.onload = () => resolve();
    document.body.appendChild(s);
  });
}

/**
 * Embedded video player with resume + progress reporting.
 * Works for YouTube (IFrame API) and Vimeo (player.js). Progress is saved every
 * few seconds while playing, on pause/leave, and completion is recorded at ~end.
 */
export function Player({
  lessonId,
  provider,
  videoId,
  initialPositionSec,
}: {
  lessonId: string;
  provider: Provider;
  videoId: string;
  initialPositionSec: number;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const lastSaved = useRef(0);
  const position = useRef(initialPositionSec);
  const completedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let ytPlayer: any;
    let vimeoPlayer: any;
    let poll: ReturnType<typeof setInterval> | undefined;

    const persist = (completed = false) => {
      const pos = Math.floor(position.current || 0);
      saveProgress({ lessonId, lastPositionSec: pos, watchedSeconds: pos, completed }).catch(() => {});
      lastSaved.current = pos;
    };
    const maybeSave = () => {
      const pos = Math.floor(position.current || 0);
      if (Math.abs(pos - lastSaved.current) >= 5) persist();
    };
    const onHide = () => persist();

    (async () => {
      if (provider === "YOUTUBE") {
        await loadScript("https://www.youtube.com/iframe_api", "yt-iframe-api");
        const start = () => {
          if (cancelled || !holderRef.current || !window.YT?.Player) return;
          ytPlayer = new window.YT.Player(holderRef.current, {
            videoId,
            playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
            events: {
              onReady: (e: any) => {
                if (initialPositionSec > 0) e.target.seekTo(initialPositionSec, true);
              },
              onStateChange: (e: any) => {
                // 1 = playing
                if (e.data === 1 && !poll) {
                  poll = setInterval(() => {
                    position.current = ytPlayer.getCurrentTime?.() ?? position.current;
                    const dur = ytPlayer.getDuration?.() ?? 0;
                    if (dur > 0 && position.current / dur >= 0.95 && !completedRef.current) {
                      completedRef.current = true;
                      persist(true);
                    } else {
                      maybeSave();
                    }
                  }, 3000);
                }
                // 0 = ended, 2 = paused
                if (e.data === 0) { completedRef.current = true; persist(true); }
                if (e.data === 2) persist();
              },
            },
          });
        };
        if (window.YT?.Player) start();
        else window.onYouTubeIframeAPIReady = start;
      } else {
        await loadScript("https://player.vimeo.com/api/player.js", "vimeo-api");
        if (cancelled || !holderRef.current || !window.Vimeo) return;
        vimeoPlayer = new window.Vimeo.Player(holderRef.current, {
          id: Number(videoId),
          responsive: true,
        });
        if (initialPositionSec > 0) vimeoPlayer.setCurrentTime(initialPositionSec).catch(() => {});
        vimeoPlayer.on("timeupdate", (d: { seconds: number; percent: number }) => {
          position.current = d.seconds;
          if (d.percent >= 0.95 && !completedRef.current) {
            completedRef.current = true;
            persist(true);
          } else {
            maybeSave();
          }
        });
        vimeoPlayer.on("pause", () => persist());
        vimeoPlayer.on("ended", () => { completedRef.current = true; persist(true); });
      }
    })();

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      persist(completedRef.current);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      try { ytPlayer?.destroy?.(); } catch {}
      try { vimeoPlayer?.destroy?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, provider, videoId]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/8 bg-black shadow-luxe">
      {provider === "YOUTUBE" ? (
        <div ref={holderRef} className="absolute inset-0 h-full w-full" />
      ) : (
        <div ref={holderRef} className="absolute inset-0 h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
      )}
    </div>
  );
}
