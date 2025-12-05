// src/components/LibraryPanel.tsx
import React, { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import { clamp } from "../utils/format";

type Props = {
  videos: VideoItem[];
  currentId: string | null;
  setCurrentId: (id: string) => void;
  watchPos: Record<string, { t: number; d: number }>;
  themeCls: any;
};

const fmtDuration = (s: number) => {
  if (!s || !isFinite(s)) return "-";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export default function LibraryPanel({
  videos,
  currentId,
  setCurrentId,
  watchPos,
  themeCls,
}: Props) {
  const [sortBy, setSortBy] = useState("newest");

  // 🎬 Find the currently playing video
  const currentVideo = useMemo(
    () => videos.find((v) => v.id === currentId),
    [videos, currentId]
  );

  // ✅ Sorting logic
  const sortedVideos = useMemo(() => {
    const sorted = [...videos];
    switch (sortBy) {
      case "oldest":
        return sorted.reverse();
      case "title":
        return sorted.sort((a, b) =>
          (a.title || a.filename).localeCompare(b.title || b.filename)
        );
      default:
        return sorted; // newest
    }
  }, [videos, sortBy]);

  // ✅ Continue Watching section
  const continueWatching = useMemo(
    () =>
      sortedVideos.filter((v) => {
        const pos = watchPos[v.id];
        return pos && pos.t > 0 && pos.d > 0 && pos.t < pos.d * 0.9;
      }),
    [sortedVideos, watchPos]
  );

  // ✅ Handler
  const handleSelect = (v: VideoItem) => {
    setCurrentId(v.id);
    localStorage.setItem("lastVideoId", v.id);
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border shadow-lg h-full flex flex-col ${themeCls.panel} p-3 min-w-0`}
    >
      {/* Header */}
      <div className="flex flex-col mb-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm opacity-80 font-medium">Library</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-transparent border border-white/20 rounded px-2 py-1"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>

        {/* 🎬 Now Playing Section */}
{currentId && (
  <div className="flex items-center gap-2 mt-2">
    {(() => {
      const currentVideo = videos.find((v) => v.id === currentId);
      if (!currentVideo) {
        console.warn("⚠️ No video found for currentId:", currentId);
        return (
          <p className="text-xs text-gray-400">No video selected or not found.</p>
        );
      }

      // Derive thumbnail safely
      const thumb =
        currentVideo.thumbnail ||
        (currentVideo.thumbnails_base
          ? `${currentVideo.thumbnails_base}/thumb_0001.jpg`
          : null);

      return (
        <>
          <div className="relative w-12 h-8 rounded overflow-hidden bg-black flex-shrink-0">
            {thumb ? (
              <img
                src={thumb}
                alt={currentVideo.title || currentVideo.filename}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.warn("❌ Thumbnail failed:", thumb);
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300">
                No Image
              </div>
            )}
            {currentVideo.status !== "ready" && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-gray-300">
                {currentVideo.status || "processing"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs text-pink-400 font-medium truncate"
              title={currentVideo.title || currentVideo.filename}
            >
              🎬 Now Playing: {currentVideo.title || currentVideo.filename}
            </p>
          </div>
        </>
      );
    })()}
  </div>
)}

      </div>

      {/* Continue Watching Section */}
      {continueWatching.length > 0 && (
        <>
          <h3 className="text-xs opacity-70 mb-2">Continue Watching</h3>
          <div className="flex flex-col gap-2 mb-3">
            {continueWatching.slice(0, 3).map((v) => {
              const pos = watchPos[v.id];
              const progress = clamp(pos.t / pos.d, 0, 1);
              return (
                <button
                  key={v.id}
                  onClick={() => handleSelect(v)}
                  className={`relative flex gap-3 p-2 rounded-lg text-left ${
                    currentId === v.id
                      ? "bg-white/10 ring-1 ring-pink-500"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-24 h-14 rounded overflow-hidden bg-black relative flex-shrink-0">
                    <img
                      src={`${v.thumbnail || v.thumbnails_base + "/thumb_0001.jpg"}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
                      <div
                        className="h-full bg-pink-500"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div
                      className="text-xs font-medium truncate"
                      title={v.title || v.filename}
                    >
                      {v.title || v.filename}
                    </div>
                    <div className="text-[10px] opacity-70">
                      {fmtDuration(pos.t)} / {fmtDuration(pos.d)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <hr className="border-white/10 mb-3" />
        </>
      )}

      {/* Full Library */}
      <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar h-full">
        {sortedVideos.map((v) => {
          const pos = watchPos[v.id];
          const progress = pos && pos.d ? clamp(pos.t / pos.d, 0, 1) : 0;

          return (
            <motion.button
              key={v.id}
              onClick={() => handleSelect(v)}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className={`relative flex gap-3 p-2 rounded-lg transition ${
                currentId === v.id
                  ? "bg-white/10 ring-1 ring-pink-500"
                  : "hover:bg-white/5"
              }`}
            >
              {/* Thumbnail */}
              <div className="w-28 h-16 bg-black rounded overflow-hidden relative flex-shrink-0">
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                {v.status !== "ready" && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-sm text-gray-400">
                    {v.status}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-500 rounded-full"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 py-[1px] rounded">
  {v.duration || ""}
</span>


                {/* ▶️ Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                  <div className="bg-black/60 p-2 rounded-full">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <div
                  className="text-sm font-medium truncate"
                  title={v.title || v.filename}
                >
                  {v.title || v.filename}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {v.status === "completed" ? "✅ Ready" : "⏳ " + v.status}
                </div>
              </div>
            </motion.button>
          );
        })}

        {videos.length === 0 && (
          <div className="text-sm opacity-70 text-center p-4">
            No videos available
          </div>
        )}
      </div>
    </motion.section>
  );
}
