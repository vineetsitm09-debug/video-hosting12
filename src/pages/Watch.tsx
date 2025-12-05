import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import VideoPlayer from "../components/VideoPlayer";

type VideoItem = {
  id: string;
  url: string;
  title: string;
  filename?: string;
  thumbnail?: string;
  uploader?: string;
  created_at?: string;
  status?: string;
};

const API_URL = import.meta.env.VITE_API_BASE || "http://18.218.164.106:5000";

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [current, setCurrent] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      const res = await fetch(`${API_URL}/videos`);
      const raw = await res.json();
      const arr = Array.isArray(raw) ? raw : raw.videos || [];

      const mapped = arr.map((v, i) => ({
        id: v.id?.toString() || v.filename || i.toString(),
        title: v.title || v.filename?.replace(/\.[^/.]+$/, "") || "Untitled",
        url:
          v.url ||
          v.video_url ||
          `${API_URL}/hls/${(v.filename || "").replace(/\.[^/.]+$/, "")}/master.m3u8`,
        thumbnail:
          v.thumbnail ||
          `${API_URL}/hls/${(v.filename || "").replace(/\.[^/.]+$/, "")}/thumb_0001.jpg`,
        uploader: v.uploader_email || "Unknown",
        created_at: v.created_at,
        status: v.status,
      }));

      setVideos(mapped);

      const found = mapped.find((v) => v.id === id);
      setCurrent(found || mapped[0]);
      setLoading(false);
    };

    loadVideos();
  }, [id]);

  if (loading || !current)
    return <div className="p-6 text-gray-400">Loading...</div>;

  const currentIndex = videos.findIndex((v) => v.id === current.id);
  const next = videos[currentIndex + 1];

  return (
    <div className="w-full flex gap-6">
      {/* LEFT SIDE */}
      <div className="flex-1 flex flex-col">

        {/* 🎥 FIXED 16:9 PLAYER CONTAINER */}
        <div
          className="relative w-full rounded-xl overflow-hidden bg-black"
          style={{ aspectRatio: "16 / 9" }}
        >
          <VideoPlayer
            key={current.id}
            video={current}
            onEnded={() => next && navigate(`/watch/${next.id}`)}
            className="absolute inset-0 w-full h-full"
          />
        </div>

        {/* Title + Meta */}
        <div className="p-4 text-white">
          <h2 className="text-xl font-semibold">{current.title}</h2>
          <p className="text-sm text-gray-400 mt-1">
            Uploaded by {current.uploader} •{" "}
            {current.created_at
              ? new Date(current.created_at).toLocaleDateString()
              : "–"}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-80 flex-shrink-0">


        {/* LIBRARY LIST */}
        <div className="rounded-2xl border shadow-lg bg-[#181818] p-3 h-[calc(100vh-180px)] overflow-y-auto">
          <h2 className="text-sm opacity-80 mb-3">Library</h2>

          <div className="flex flex-col gap-2">
            {videos.map((v) => (
              <Link
                to={`/watch/${v.id}`}
                key={v.id}
                className={`flex gap-2 p-2 rounded-lg hover:bg-white/5 transition ${
                  current.id === v.id ? "ring-1 ring-pink-500" : ""
                }`}
              >
                <div className="w-28 h-16 rounded overflow-hidden bg-black flex-shrink-0">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {v.title}
                  </div>
                  <div className="text-xs text-gray-400">{v.uploader}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
