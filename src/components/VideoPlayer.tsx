// src/components/VideoPlayer.tsx
import React, {
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import usePlayer from "./usePlayer";
import Controls from "./Controls";
import Hls from "hls.js";

export type Chapter = { time: number; title: string };
export type VideoMeta = {
  url: string;
  title?: string;
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

// -----------------------------------------
//            VIDEO PLAYER START
// -----------------------------------------

const VideoPlayer = forwardRef<PlayerHandle, Props>(
  ({ video, autoPlay = true, startTime = 0, chapters = [], onEnded, className = "" }, ref) => {
    const { vRef, state, actions } = usePlayer({ video, autoPlay, startTime });

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showCursor, setShowCursor] = useState(true);
    const [dominantColor, setDominantColor] = useState("#0a0a0a");

    const [ambientEnabled] = useState(true);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // NEW — ambient flash
    const [pulseKey, setPulseKey] = useState(0);

    // -----------------------------------------
    // EXTRACT DOMINANT POSTER COLOR
    // -----------------------------------------

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

          const data = cx.getImageData(0, 0, 32, 18).data;

          let r = 0,
            g = 0,
            b = 0;

          for (let i = 0; i < data.length; i += 12) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }

          r = Math.round(r / (data.length / 12));
          g = Math.round(g / (data.length / 12));
          b = Math.round(b / (data.length / 12));

          setDominantColor(`rgb(${r}, ${g}, ${b})`);
        } catch {}
      };
    }, [video?.poster]);

    // -----------------------------------------
    // HLS INITIALIZATION
    // -----------------------------------------

    useEffect(() => {
  const el = vRef.current;
  if (!el || !video?.url) return;

  try {
    el.pause();
    el.removeAttribute("src");
    el.load();
  } catch {}

  let hls: Hls | null = null;

  const safePlay = async () => {
    try {
      if (autoPlay) await el.play();
    } catch {
      try {
        el.muted = true;
        await el.play();
        setTimeout(() => (el.muted = false), 300);
      } catch {}
    }
  };

  if (video.url.endsWith(".m3u8")) {
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(video.url);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, () => safePlay());
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

  // ✅ FIXED CLEANUP FUNCTION
// ✅ FIXED CLEANUP FUNCTION  
return () => {
  el.removeEventListener("play", handlePlay);

  if (hls) {
    try {
      hls.destroy();
    } catch {}
  }
};


    // -----------------------------------------
    // HANDLE ENDED
    // -----------------------------------------

    useEffect(() => {
      const el = vRef.current;
      if (!el) return;

      const fn = () => onEnded?.();
      el.addEventListener("ended", fn);
      return () => el.removeEventListener("ended", fn);
    }, [onEnded]);

    // -----------------------------------------
    // FULLSCREEN
    // -----------------------------------------

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

    // -----------------------------------------
    // KEYBOARD SHORTCUTS
    // -----------------------------------------

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) return;

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

    // -----------------------------------------
    // AUTO-HIDE CONTROLS
    // -----------------------------------------

    const resetHideTimer = useCallback(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);

      setShowControls(true);
      setShowCursor(true);

      hideTimer.current = setTimeout(() => {
        if (state.isPlaying) {
          setShowControls(false);
          setShowCursor(false);
        }
      }, 2400);
    }, [state.isPlaying]);

    useEffect(() => {
      resetHideTimer();
      return () => hideTimer.current && clearTimeout(hideTimer.current);
    }, [resetHideTimer]);

    // -----------------------------------------
    // RENDER
    // -----------------------------------------

    return (
      <motion.div
        key={video.url}
className={`relative w-full max-w-[1980px] aspect-video mx-auto overflow-hidden rounded-xl shadow-xl ${className} ${
  showCursor ? "cursor-default" : "cursor-none"
}`}

        onMouseMove={resetHideTimer}
        onMouseEnter={resetHideTimer}
      >
        {/* -----------------------------------------
            AMBIENT FLASH (YouTube style)
        ----------------------------------------- */}
        {ambientEnabled && (
          <motion.div
            key={pulseKey}
            initial={{ opacity: 0, scale: 1, filter: "brightness(1) saturate(1)" }}
            animate={{
              opacity: [0, 1, 0.8, 0.5],
              scale: [1, 1.15, 1.08, 1],
              filter: [
                "brightness(1) saturate(1)",
                "brightness(2.5) saturate(1.7)",
                "brightness(1.8) saturate(1.3)",
                "brightness(1.2) saturate(1.1)",
              ],
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute inset-[-30%] pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 30% 40%, ${dominantColor} 20%, transparent 60%),
                radial-gradient(circle at 70% 70%, ${dominantColor} 20%, transparent 60%)
              `,
              mixBlendMode: "screen",
              filter: "blur(150px)",
              zIndex: 0,
            }}
          />
        )}

        {/* -----------------------------------------
            BREATHING AMBIENT BACKGROUND
        ----------------------------------------- */}
        {ambientEnabled && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0.35, scale: 1 }}
            animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.02, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-[-25%] pointer-events-none"
            style={{
              background: `
                radial-gradient(circle at 25% 40%, ${dominantColor} 12%, transparent 55%),
                radial-gradient(circle at 75% 70%, ${dominantColor} 12%, transparent 55%)
              `,
              mixBlendMode: "screen",
              filter: "blur(150px)",
              zIndex: 0,
            }}
          />
        )}

        {/* -----------------------------------------
            VIDEO ELEMENT
        ----------------------------------------- */}
        <video
          ref={vRef}
          className="relative z-10 w-full h-full object-cover bg-black"
          poster={video.poster}
          playsInline
          preload="auto"
          onClick={actions.playPause}
        />

        {/* -----------------------------------------
            BUFFER FADE-IN
        ----------------------------------------- */}
        <AnimatePresence>
          {state.isBuffering && (
            <motion.div
              className="absolute inset-0 bg-black z-20"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            />
          )}
        </AnimatePresence>

        {/* -----------------------------------------
            PAUSE OVERLAY
        ----------------------------------------- */}
        <AnimatePresence>
          {!state.isPlaying && !state.isBuffering && (
            <motion.div
              className="absolute inset-0 z-30 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {video.title && (
                <div className="text-white text-xl mb-4">{video.title}</div>
              )}
              <motion.button
                whileHover={{ scale: 1.07 }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 to-fuchsia-500 grid place-items-center shadow-2xl"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.play();
                }}
              >
                <Play className="w-10 h-10 text-white" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* -----------------------------------------
            BUFFERING SPINNER
        ----------------------------------------- */}
        {state.isBuffering && (
          <div className="absolute inset-0 grid place-items-center z-40 bg-black/30">
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
          </div>
        )}

        {/* -----------------------------------------
            CONTROLS
        ----------------------------------------- */}
        {showControls && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-[50]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
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

});   // ⭐ FIX ADDED — closes the forwardRef callback properly

export default VideoPlayer;
