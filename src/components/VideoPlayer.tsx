// -------------------------------------------------------------------
// VideoPlayer.tsx (FULLY FIXED VERSION)
// -------------------------------------------------------------------

import React, {
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Hls from "hls.js";

import usePlayer from "./usePlayer";
import Controls from "./Controls";

// -------------------------------------------------------------------
// REQUIRED FIXED TYPES
// -------------------------------------------------------------------

export type VideoItem = {
  id: string;
  title: string;
  filename?: string;
  thumbnail?: string;
  uploader?: string;
  created_at?: string;
  status?: string;
};

export type Chapter = { time: number; title: string };

export type VideoMeta = VideoItem & {
  url: string;
  poster?: string;
  thumbnails_base?: string;
};

export type PlayerHandle = {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  getState: () => any;
};

type Props = {
  video: VideoMeta;
  autoPlay?: boolean;
  startTime?: number;
  chapters?: Chapter[];
  onEnded?: () => void;
  className?: string;
};

// -------------------------------------------------------------------
// VIDEO PLAYER COMPONENT
// -------------------------------------------------------------------

const VideoPlayer = forwardRef<PlayerHandle, Props>(
  (
    {
      video,
      autoPlay = true,
      startTime = 0,
      chapters = [],
      onEnded,
      className = "",
    },
    ref
  ) => {
    const { vRef, state, actions } = usePlayer({ video, autoPlay, startTime });

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showCursor, setShowCursor] = useState(true);

    const [dominantColor, setDominantColor] = useState("#0a0a0a");
    const [ambientEnabled] = useState(true);

    const hideTimer = useRef<NodeJS.Timeout | null>(null);
    const [pulseKey, setPulseKey] = useState(0);

    // -------------------------------------------------------------------
    // Extract Ambient Poster Color
    // -------------------------------------------------------------------
    useEffect(() => {
      if (!video?.poster) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = video.poster;

      img.onload = () => {
        try {
          const cv = document.createElement("canvas");
          const cx = cv.getContext("2d");
          if (!cx) return;

          cv.width = 32;
          cv.height = 18;
          cx.drawImage(img, 0, 0, 32, 18);

          const d = cx.getImageData(0, 0, 32, 18).data;

          let r = 0,
            g = 0,
            b = 0;

          for (let i = 0; i < d.length; i += 16) {
            r += d[i];
            g += d[i + 1];
            b += d[i + 2];
          }

          const count = d.length / 16;
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          setDominantColor(`rgb(${r}, ${g}, ${b})`);
        } catch {}
      };
    }, [video?.poster]);

    // -------------------------------------------------------------------
    // Initialize HLS
    // -------------------------------------------------------------------
    useEffect(() => {
      const el = vRef.current;
      if (!el || !video?.url) return;

      let hls: Hls | null = null;

      const safePlay = async () => {
        try {
          if (autoPlay) await el.play();
        } catch {
          el.muted = true;
          await el.play().catch(() => {});
          setTimeout(() => (el.muted = false), 300);
        }
      };

      if (video.url.endsWith(".m3u8")) {
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(video.url);
          hls.attachMedia(el);
          hls.on(Hls.Events.MANIFEST_PARSED, safePlay);
        } else {
          el.src = video.url;
          el.addEventListener("loadedmetadata", safePlay, { once: true });
        }
      } else {
        el.src = video.url;
        safePlay();
      }

      const handlePlay = () => setPulseKey((k) => k + 1);
      el.addEventListener("play", handlePlay);

      return () => {
        el.removeEventListener("play", handlePlay);
        hls?.destroy();
      };
    }, [video.url, autoPlay]);

    // -------------------------------------------------------------------
    // ENDED EVENT
    // -------------------------------------------------------------------
    useEffect(() => {
      const el = vRef.current;
      if (!el) return;

      const fn = () => onEnded?.();

      el.addEventListener("ended", fn);
      return () => el.removeEventListener("ended", fn);
    }, [onEnded]);

    // -------------------------------------------------------------------
    // Fullscreen Toggle
    // -------------------------------------------------------------------
    const toggleFullscreen = useCallback(() => {
      const wrapper = vRef.current?.parentElement;
      if (!wrapper) return;

      if (!document.fullscreenElement) {
        wrapper.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    }, []);

    // -------------------------------------------------------------------
    // Keyboard Shortcuts
    // -------------------------------------------------------------------
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || ""))
          return;

        switch (e.key.toLowerCase()) {
          case " ":
          case "k":
            e.preventDefault();
            actions.playPause();
            break;
          case "j":
            actions.seekBy(-10);
            break;
          case "l":
            actions.seekBy(10);
            break;
          case "m":
            actions.toggleMute();
            break;
          case "f":
            toggleFullscreen();
            break;
        }
      };

      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [actions, toggleFullscreen]);

    // -------------------------------------------------------------------
    // Auto Hide Controls
    // -------------------------------------------------------------------
    const resetHide = useCallback(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);

      setShowControls(true);
      setShowCursor(true);

      hideTimer.current = setTimeout(() => {
        if (state.isPlaying) {
          setShowControls(false);
          setShowCursor(false);
        }
      }, 2500);
    }, [state.isPlaying]);

    useEffect(() => {
      resetHide();
      return () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
      };
    }, [resetHide]);

    // -------------------------------------------------------------------
    // Expose API to Parent
    // -------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      play: actions.play,
      pause: actions.pause,
      seek: actions.seekAbs,
      getState: () => state,
    }));

    // -------------------------------------------------------------------
    // RENDER UI
    // -------------------------------------------------------------------
    return (
      <motion.div
        key={video.url}
        className={`relative w-full max-w-[1980px] aspect-video mx-auto overflow-hidden rounded-xl shadow-xl ${className} ${
          showCursor ? "cursor-default" : "cursor-none"
        }`}
        onMouseMove={resetHide}
        onMouseEnter={resetHide}
      >
        {/* Ambient Glow */}
        {ambientEnabled && (
          <motion.div
            key={pulseKey}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.8, 0.4], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8 }}
            className="absolute inset-[-30%] pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 30% 40%, ${dominantColor} 20%, transparent 60%),
                radial-gradient(circle at 70% 70%, ${dominantColor} 20%, transparent 60%)
              `,
              mixBlendMode: "screen",
              filter: "blur(150px)",
            }}
          />
        )}

        {/* VIDEO */}
        <video
          ref={vRef}
          className="relative z-10 w-full h-full object-cover bg-black"
          poster={video.poster}
          playsInline
          preload="auto"
          onClick={actions.playPause}
        />

        {/* BUFFERING */}
        {state.isBuffering && (
          <div className="absolute inset-0 grid place-items-center z-50 bg-black/40">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        )}

        {/* CONTROLS */}
        {showControls && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-[60]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Controls
              isPlaying={state.isPlaying}
              isMuted={state.isMuted}
              volume={state.volume}
              duration={state.duration}
              currentTime={state.currentTime}
              buffered={state.buffered}
              levels={state.levels}
              currentLevel={state.currentLevel}
              subtitles={state.subtitles}
              currentSubtitle={state.currentSubtitle}
              thumbnailsBase={video.thumbnails_base}
              chapters={chapters}
              onPlayPause={actions.playPause}
              onSeekBy={actions.seekBy}
              onSeekTo={actions.seekAbs}
              onVolume={actions.setVolume}
              onToggleMute={actions.toggleMute}
              onChangeQuality={actions.changeQuality}
              onChangeSubtitle={actions.setSubtitle}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </motion.div>
        )}
      </motion.div>
    );
  }
);

export default VideoPlayer;
