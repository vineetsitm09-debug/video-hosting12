// src/components/VideoPlayer/usePlayer.ts
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Hls, { Level } from "hls.js";

// Clamp helper
const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

import type { VideoMeta } from "./VideoPlayer";


export default function usePlayer({
  video,
  autoPlay = true,
  startTime = 0,
}: {
  video: VideoMeta;
  autoPlay?: boolean;
  startTime?: number;
}) {
  const vRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | "auto">("auto");
  const [subtitles, setSubtitles] = useState<{ id: number; label: string }[]>(
    []
  );
  const [currentSubtitle, setCurrentSubtitle] =
    useState<number | "off">("off");

  // ---- Basic controls ----
  const play = useCallback(async () => {
    const el = vRef.current;
    if (el) await el.play().catch(() => {});
  }, []);

  const pause = useCallback(() => vRef.current?.pause(), []);

  const playPause = useCallback(() => {
    const v = vRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = vRef.current;
    if (!v) return;
    v.currentTime = clamp(v.currentTime + delta, 0, v.duration);
  }, []);

  const seekAbs = useCallback((t: number) => {
    const v = vRef.current;
    if (v) v.currentTime = clamp(t, 0, v.duration);
  }, []);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  const setVol = useCallback((v: number) => {
    const el = vRef.current;
    if (!el) return;
    el.volume = clamp(v, 0, 1);
    setVolume(v);
  }, []);

  const changeQuality = useCallback((lvl: number | "auto") => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = lvl === "auto" ? -1 : lvl;
    setCurrentLevel(lvl);
  }, []);

  const setSubtitle = useCallback((id: number | "off") => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.subtitleTrack = id === "off" ? -1 : id;
    setCurrentSubtitle(id);
  }, []);

  // ---- HLS Setup ----
  useEffect(() => {
    const el = vRef.current;
    if (!el || !video?.url) return;

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
    }
    hlsRef.current = null;

    // Reset player state
    setIsBuffering(true);
    setLevels([]);
    setSubtitles([]);

    el.muted = isMuted;
    el.volume = volume;

    const safeStart = () => {
      if (startTime > 0) el.currentTime = startTime;
      if (autoPlay) el.play().catch(() => {});
    };

    // Native HLS (Safari)
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = video.url;
      el.addEventListener("loadedmetadata", safeStart);
      return () =>
        el.removeEventListener("loadedmetadata", safeStart);
    }

    // HLS.js
    if (video.url.endsWith(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 0,
      });
      hlsRef.current = hls;

      hls.attachMedia(el);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(video.url);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels || []);
        safeStart();
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        setSubtitles(
          data.subtitleTracks.map((t: any, i: number) => ({
            id: i,
            label: t.name || `Subtitle ${i + 1}`,
          }))
        );
      });

      return () => {
        try {
          hls.destroy();
        } catch {}
      };
    }

    // Fallback for MP4, WebM
    el.src = video.url;
    safeStart();

    return () => {
      try {
        el.pause();
      } catch {}
    };
  }, [video?.url, autoPlay, startTime, isMuted, volume]);

  // ---- Track timing updates ----
  useEffect(() => {
    const el = vRef.current;
    if (!el) return;

    const update = () => {
      setCurrentTime(el.currentTime);
      setDuration(el.duration || 0);
      try {
        const i = el.buffered.length - 1;
        setBuffered(i >= 0 ? el.buffered.end(i) : 0);
      } catch {}
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);

    el.addEventListener("timeupdate", update);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);

    return () => {
      el.removeEventListener("timeupdate", update);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
    };
  }, [video?.url]);

  // ---- COMPACT STATE + ACTIONS ----
  const state = useMemo(
    () => ({
      isPlaying,
      isBuffering,
      duration,
      currentTime,
      buffered,
      volume,
      isMuted,
      levels,
      currentLevel,
      subtitles,
      currentSubtitle,
    }),
    [
      isPlaying,
      isBuffering,
      duration,
      currentTime,
      buffered,
      volume,
      isMuted,
      levels,
      currentLevel,
      subtitles,
      currentSubtitle,
    ]
  );

  const actions = useMemo(
    () => ({
      play,
      pause,
      playPause,
      seekBy,
      seekAbs,
      toggleMute,
      setVolume: setVol,
      changeQuality,
      setSubtitle,
    }),
    [
      play,
      pause,
      playPause,
      seekBy,
      seekAbs,
      toggleMute,
      setVol,
      changeQuality,
      setSubtitle,
    ]
  );

  return { vRef, state, actions };
}

