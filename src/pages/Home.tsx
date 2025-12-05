import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HomeFeed from "./HomeFeed";

const API_URL = import.meta.env.VITE_API_BASE || "http://18.218.164.106:5000";

export default function Home() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/videos`);
        const rawData = await res.json();
        const data = Array.isArray(rawData) ? rawData : rawData.videos || [];

        // ✅ Normalize for consistent rendering
        const normalized = data.map((v: any, i: number) => ({
          id: v.filename || i.toString(),
          title: v.title || v.filename || "Untitled Video",
          thumbnail: `http://18.218.164.106:5000/hls/thumbnails/${v.filename}/thumb_0001.jpg`,
          uploader: v.uploader_email || "Unknown Channel",
          views: v.views || Math.floor(Math.random() * 50000 + 100),
          duration: v.duration || Math.floor(Math.random() * 240) + 60,
          created_at: v.created_at,
          filename: v.filename,
        }));

        setVideos(normalized);
      } catch (err) {
        console.error("❌ Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="px-4 md:px-8 py-6">
      <h1 className="text-xl font-semibold mb-5 text-white">Recommended</h1>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <SkeletonGrid />
          </motion.div>
        ) : (
          <motion.div
            key="videos"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: {
                opacity: 1,
                y: 0,
                transition: {
                  staggerChildren: 0.08, // 👈 delay each card
                  delayChildren: 0.2, // 👈 delay before grid starts animating
                },
              },
            }}
          >
            <HomeFeedAnimated videos={videos} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** 🎬 Animated Feed Grid (Stagger Effect) */
function HomeFeedAnimated({ videos }: { videos: any[] }) {
  return (
    <motion.div
      className="grid gap-8 p-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
    >
      {videos.map((v, i) => (
        <motion.div
          key={v.id || i}
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            show: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.4, ease: "easeOut" },
            },
          }}
        >
          {/* 🔥 Use your existing HomeFeed card component */}
          <HomeFeed videos={[v]} />
        </motion.div>
      ))}
    </motion.div>
  );
}

/** 🧱 Skeleton Placeholder Grid (YouTube shimmer) */
function SkeletonGrid() {
  const placeholders = Array.from({ length: 10 });
  return (
    <div
      className="grid gap-8 p-4
                 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
                 xl:grid-cols-5"
    >
      {placeholders.map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="rounded-xl overflow-hidden bg-gray-800 aspect-video mb-3"></div>
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-700"></div>
            <div className="flex-1">
              <div className="h-3 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-gray-800 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
