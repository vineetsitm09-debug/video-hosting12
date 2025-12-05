// src/components/VideoPlayer/Controls.tsx
import React, { useState, useEffect } from "react";
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  Maximize2, Minimize2, Settings, Captions, ListVideo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fmt = (s: number) => {
  if (!s || !isFinite(s)) return "-";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export default function Controls({
  isPlaying, isMuted, volume, duration, currentTime, buffered,
  levels, currentLevel, subtitles, currentSubtitle,
  thumbnailsBase, chapters = [],
  onPlayPause, onSeekBy, onSeekTo, onVolume, onToggleMute,
  onChangeQuality, onChangeSubtitle,
  isFullscreen, onToggleFullscreen
}: any) {
  const [showQuality, setShowQuality] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  // ✅ Close settings menus when video starts playing
  useEffect(() => {
    if (isPlaying) {
      setShowQuality(false);
      setShowSubs(false);
      setShowChapters(false);
    }
  }, [isPlaying]);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl text-white px-4 py-3 rounded-b-3xl select-none">
      {/* Progress Bar */}
      <div
        className="relative w-full h-3 cursor-pointer group"
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          onSeekTo(pct * duration);
        }}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          setHoverPct(pct);
          setHoverTime(pct * (duration || 0));
        }}
        onMouseLeave={() => {
          setHoverPct(null);
          setHoverTime(null);
        }}
      >
        <div className="absolute inset-0 bg-white/20 rounded-full" />
        <div
          className="absolute inset-0 bg-white/40 rounded-full"
          style={{ width: `${bufferedPct}%` }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-pink-500 to-fuchsia-400 rounded-full"
          style={{ width: `${progressPct}%` }}
        />

        {/* Thumbnail Hover Preview */}
        <AnimatePresence>
          {hoverPct !== null && hoverTime !== null && thumbnailsBase && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-6 left-0 flex flex-col items-center"
              style={{
                transform: `translateX(${hoverPct * 100}%) translateX(-50%)`,
              }}
            >
              <img
                src={`${thumbnailsBase}/thumb_${String(
                  Math.floor(hoverTime / 5) + 1
                ).padStart(4, "0")}.jpg`}
                className="w-40 h-24 object-cover rounded-lg shadow-lg"
                alt="thumbnail preview"
              />
              <span className="mt-1 text-xs font-mono bg-black/80 px-2 py-0.5 rounded-md">
                {fmt(hoverTime)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => onSeekBy(-10)}><SkipBack /></button>
          <button onClick={onPlayPause}>{isPlaying ? <Pause /> : <Play />}</button>
          <button onClick={() => onSeekBy(10)}><SkipForward /></button>

          {/* Volume Control Group */}
          <button onClick={onToggleMute}>
            {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            // 💡 FIX: Set the slider value to the volume state. If muted, show 0.
            value={isMuted ? 0 : volume} 
            // 💡 FIX: When the slider changes, call onVolume with the numerical value.
            onChange={(e) => onVolume(Number(e.target.value))} 
            className="w-20 accent-pink-500"
          />
          {/* End Volume Control Group */}

          <span>{fmt(currentTime)} / {fmt(duration)}</span>
        </div>

        {/* Settings and Quality */}
        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <button onClick={() => { setShowQuality(!showQuality); setShowSubs(false); }}>
              <Settings />
            </button>

            <AnimatePresence>
              {showQuality && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-10 right-0 bg-black/90 rounded-lg border border-white/10 p-2 w-36 text-xs"
                >
                  <button
                    onClick={() => { onChangeQuality("auto"); setShowQuality(false); }}
                    className={`block w-full text-left px-2 py-1 rounded hover:bg-white/10 ${currentLevel === "auto" ? "text-pink-400" : ""}`}
                  >
                    Auto
                  </button>
                  {levels.map((lvl: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => { onChangeQuality(i); setShowQuality(false); }}
                      className={`block w-full text-left px-2 py-1 rounded hover:bg-white/10 ${currentLevel === i ? "text-pink-400" : ""}`}
                    >
                      {lvl.height}p
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={onToggleFullscreen}>
            {isFullscreen ? <Minimize2 /> : <Maximize2 />}
          </button>
        </div>
      </div>
    </div>
  );
}