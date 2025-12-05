import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  "All",
  "Music",
  "Gaming",
  "News",
  "Sports",
  "Movies",
  "Tech",
  "Podcasts",
  "Education",
  "Comedy",
  "Lifestyle",
  "Travel",
];

// 🟣 Shimmer loader
function ShimmerCard() {
  return (
    <div className="animate-pulse">
      <div className="rounded-xl bg-gray-800 aspect-video mb-3" />
      <div className="flex gap-3">
        <div className="w-9 h-9 bg-gray-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function HomeFeed({ videos }: { videos: any[] }) {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    if (videos.length > 0) setTimeout(() => setLoading(false), 500);
  }, [videos]);

  const filteredVideos = useMemo(() => {
    if (category === "All") return videos;
    return videos.filter(
      (v) =>
        v.category?.toLowerCase() === category.toLowerCase() ||
        v.title?.toLowerCase().includes(category.toLowerCase())
    );
  }, [videos, category]);

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return `${Math.floor(diff / 2592000)} months ago`;
  };

  const fmtViews = (num: number) => {
    if (!num) return "0 views";
    if (num > 1_000_000) return `${(num / 1_000_000).toFixed(1)}M views`;
    if (num > 1_000) return `${(num / 1_000).toFixed(1)}K views`;
    return `${num} views`;
  };

  if (loading)
    return (
      <div className="p-4">
        <CategoryTabs category={category} setCategory={setCategory} />
        <div
          className="grid gap-8 mt-6
                   grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {Array(10)
            .fill(0)
            .map((_, i) => (
              <ShimmerCard key={i} />
            ))}
        </div>
      </div>
    );

  if (!videos?.length)
    return (
      <div className="text-center text-gray-400 mt-10">No videos available 🎥</div>
    );

  return (
    <div className="p-4">
      {/* 🏷 Category Tabs */}
      <CategoryTabs category={category} setCategory={setCategory} />

      {/* 🎞 Video Grid */}
      <motion.div
        layout
        className="grid gap-8 mt-6
                   grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        <AnimatePresence mode="popLayout">
          {filteredVideos.map((v, i) => (
            <HoverPreviewCard
              key={v.id || i}
              video={v}
              fmtViews={fmtViews}
              timeAgo={timeAgo}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/** 🧩 Category Tabs Component */
function CategoryTabs({
  category,
  setCategory,
}: {
  category: string;
  setCategory: (c: string) => void;
}) {
  return (
    <div className="flex overflow-x-auto space-x-3 scrollbar-hide pb-1">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => setCategory(c)}
          className={`relative px-4 py-1 text-sm rounded-full whitespace-nowrap transition-all ${
            category === c
              ? "bg-gradient-to-r from-pink-600 to-fuchsia-500 text-white font-medium"
              : "bg-[#222] hover:bg-[#333] text-gray-300"
          }`}
        >
          {c}
          {category === c && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-600 to-fuchsia-500 opacity-20 z-[-1]"
            />
          )}
        </button>
      ))}
    </div>
  );
}

/** 🎬 Video Card (same as before) */
function HoverPreviewCard({
  video,
  fmtViews,
  timeAgo,
}: {
  video: any;
  fmtViews: (n: number) => string;
  timeAgo: (d: string) => string;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Link to={`/watch/${video.id}`} className="group block">
      <motion.div
        className="rounded-xl overflow-hidden bg-gray-900 shadow-md cursor-pointer"
        whileHover={{
          scale: 1.04,
          y: -4,
          boxShadow:
            "0 8px 25px rgba(255, 0, 128, 0.2), 0 0 10px rgba(255, 0, 128, 0.2)",
        }}
        transition={{ type: "spring", stiffness: 220, damping: 15 }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="relative aspect-video bg-gray-800">
          {!isHovering ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <motion.video
              src={`http://18.218.164.106:5000/hls/${video.filename}/master.m3u8`}
              className="object-cover w-full h-full"
              muted
              loop
              autoPlay
              playsInline
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
          )}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
            {video.duration ? formatDuration(video.duration) : ""}
          </div>
        </div>

        <div className="flex mt-3 gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-600 to-fuchsia-500 text-white text-sm font-semibold">
            {video.uploader?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-pink-400">
              {video.title || "Untitled Video"}
            </h3>
            <p className="text-gray-400 text-xs mt-1">
              {video.uploader || "Unknown Channel"}
            </p>
            <p className="text-gray-500 text-xs">
              {fmtViews(video.views || 0)} • {timeAgo(video.created_at)}
            </p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/** ⏱ Duration formatter */
function formatDuration(seconds: number) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}
