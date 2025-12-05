// src/components/VideoPlayer/usePlayer.ts
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Hls, { Level } from "hls.js";

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

export default function usePlayer({ video, autoPlay = true, startTime = 0 }) {
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
  const [subtitles, setSubtitles] = useState<{ id: number; label: string }[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<number | "off">("off");

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
    if (lvl === "auto") hls.currentLevel = -1;
    else hls.currentLevel = lvl;
    setCurrentLevel(lvl);
  }, []);
  const setSubtitle = useCallback((id: number | "off") => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (id === "off") hls.subtitleTrack = -1;
    else hls.subtitleTrack = id;
    setCurrentSubtitle(id);
  }, []);

  useEffect(() => {
    const el = vRef.current;
    if (!el || !video?.url) return;

    const currentSession = Symbol("videoSession");
    (hlsRef as any).session = currentSession;

    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }

    try { el.pause(); } catch {}
    el.removeAttribute("src");
    el.load();

    setIsBuffering(true);
    setLevels([]);
    setSubtitles([]);
    setCurrentLevel("auto");
    setCurrentSubtitle("off");

    el.muted = isMuted;
    el.volume = volume;

    const startPlay = () => {
      if ((hlsRef as any).session !== currentSession) return;
      if (startTime > 0) el.currentTime = startTime;
      if (autoPlay) el.play().catch(() => {});
    };

    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = video.url;
      el.load();
      el.addEventListener("loadedmetadata", startPlay);
      return () => el.removeEventListener("loadedmetadata", startPlay);
    }

    if (video.url.endsWith(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        capLevelToPlayerSize: true,
        lowLatencyMode: false,
        backBufferLength: 0,
      });
      hlsRef.current = hls;
      (hlsRef as any).session = currentSession;

      hls.attachMedia(el);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(video.url));
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels);
        hls.currentLevel = -1;
        startPlay();
      });
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        setSubtitles(
          data.subtitleTracks.map((t: any, i: number) => ({
            id: i,
            label: t.name || `Subtitle ${i + 1}`,
          }))
        );
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if ((hlsRef as any).session !== currentSession) return;
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else hls.destroy();
        }
      });
      return () => {
        if ((hlsRef as any).session === currentSession && hlsRef.current) {
          try { hlsRef.current.destroy(); } catch {}
          hlsRef.current = null;
        }
      };
    }

    el.src = video.url;
    el.load();
    startPlay();

    return () => {
      try { el.pause(); } catch {}
    };
  }, [video?.url, autoPlay, startTime]);

  useEffect(() => {
    const el = vRef.current;
    if (!el) return;
    const update = () => {
      setCurrentTime(el.currentTime);
      setDuration(el.duration);
      try {
        const i = el.buffered?.length ? el.buffered.length - 1 : 0;
        const b = el.buffered?.length ? el.buffered.end(i) : 0;
        setBuffered(b);
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
  }, [video.url]);

  const state = useMemo(() => ({
    isPlaying, isBuffering, duration, currentTime, buffered,
    volume, isMuted, levels, currentLevel, subtitles, currentSubtitle
  }), [isPlaying, isBuffering, duration, currentTime, buffered, volume, isMuted, levels, currentLevel, subtitles, currentSubtitle]);

  const actions = useMemo(() => ({
    play, pause, playPause, seekBy, seekAbs,
    toggleMute, setVolume: setVol, changeQuality, setSubtitle
  }), [play, pause, playPause, seekBy, seekAbs, toggleMute, setVol, changeQuality, setSubtitle]);

  return { vRef, state, actions };
}
