// src/useAppLogic.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoItem } from "./types";
import { useAuth } from "./context/AuthContext";
import { getAuth } from "firebase/auth";

const API_URL = import.meta.env.VITE_API_BASE || "http://18.218.164.106:5000";

export function useAppLogic() {
  // ---------------- STATES ----------------
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [theme, setTheme] = useState<"dark" | "neon">(
    () => (localStorage.getItem("theme") as "dark" | "neon") || "dark"
  );

  const [autoplayNext, setAutoplayNext] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [toast, setToast] = useState<
    { message: string; type: "success" | "error" } | null
  >(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const { token } = useAuth();

  const [watchPos, setWatchPos] = useState<
    Record<string, { t: number; d: number }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("watchPos") || "{}");
    } catch {
      return {};
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upNextVisible, setUpNextVisible] = useState(false);
  const [upNextCount, setUpNextCount] = useState(5);

  // ---------------- FETCH VIDEOS ----------------
  const fetchVideos = async () => {
    try {
      const res = await fetch(`${API_URL}/videos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      // Ensure correct structure
      const arr = Array.isArray(result.videos) ? result.videos : [];

      // Normalize data
      const normalized: VideoItem[] = arr.map((v: any, i: number) => ({
        id: v.id?.toString() || v._id || v.videoId || `vid-${i}`,
        title: v.title || v.filename || "Untitled Video",
        filename: v.filename,
        thumbnail:
          v.thumbnail ||
          (v.filename
            ? `${API_URL}/hls/thumbnails/${v.filename}/thumb_0001.jpg`
            : null),
        duration: v.duration || 0,
        uploader: v.uploader || v.uploader_email || "Unknown",
        status: v.status || "ready",

        // ⭐️ FIX: Normalize stream URL
        video_url:
          v.video_url ||
          v.url ||
          (v.filename
            ? `${API_URL}/hls/${v.filename}/master.m3u8`
            : undefined),

        url:
          v.video_url ||
          v.url ||
          (v.filename
            ? `${API_URL}/hls/${v.filename}/master.m3u8`
            : undefined),

        created_at: v.created_at || null,
      }));

      setVideos(normalized);

      // Preserve selected video
      setCurrentId((prev) => {
        if (prev && normalized.some((v) => v.id === prev)) return prev;

        const saved = localStorage.getItem("lastVideoId");
        if (saved && normalized.some((v) => v.id === saved)) return saved;

        return normalized[0]?.id || null;
      });
    } catch (err) {
      console.error("❌ Error fetching videos:", err);
      setToast({ message: "Failed to load videos", type: "error" });
    }
  };

  useEffect(() => {
    fetchVideos();
    const int = setInterval(fetchVideos, 30000);
    return () => clearInterval(int);
  }, [token]);

  // ---------------- UPLOAD HANDLER ----------------
  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      if (!token) {
        setToast({ message: "Please login", type: "error" });
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/upload`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };

      xhr.onload = async () => {
        setUploading(false);

        if (xhr.status === 200) {
          setToast({ message: "Upload complete", type: "success" });
          await fetchVideos();
        } else {
          setToast({ message: "Upload failed", type: "error" });
        }

        e.target.value = "";
      };

      xhr.onerror = () => {
        setUploading(false);
        setToast({ message: "Network error", type: "error" });
      };

      xhr.send(formData);
    } catch (err) {
      console.error(err);
      setToast({ message: "Upload failed", type: "error" });
      setUploading(false);
    }
  };

  // ---------------- SYNC LOCAL STORAGE ----------------
  useEffect(() => {
    if (currentId) localStorage.setItem("lastVideoId", currentId);
  }, [currentId]);

  useEffect(() => {
    localStorage.setItem("watchPos", JSON.stringify(watchPos));
  }, [watchPos]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ---------------- COMPUTED VALUES ----------------
  const current = useMemo(
    () => videos.find((v) => v.id === currentId) || null,
    [videos, currentId]
  );

  const currentVideo = useMemo(() => {
    if (!current) return undefined;

    return {
      id: current.id,
      title: current.title,
      url: current.video_url || current.url,
      thumbnail: current.thumbnail,
      savedPos: watchPos[current.id] || { t: 0, d: current.duration },
    };
  }, [current, watchPos]);

  const currentIndex = videos.findIndex((v) => v.id === currentId);

  const nextVideo =
    currentIndex >= 0 ? videos[(currentIndex + 1) % videos.length] : null;

  // ---------------- RETURN ----------------
  return {
    videos,
    currentVideo,
    nextVideo,
    handleUpload,
    uploading,
    uploadProgress,
    toast,
    setToast,
    q,
    setQ,
    theme,
    setTheme,
    themeCls: {
      page: theme === "dark" ? "bg-[#0d0d0d]" : "bg-[#090015]",
      panel: theme === "dark" ? "bg-[#111]" : "bg-[#140028]",
      pill: theme === "dark" ? "bg-white/10" : "bg-pink-600/40",
      accent: theme === "dark" ? "text-white" : "text-pink-400",
    },
    fileInputRef,
    isFullscreen,
    setIsFullscreen,
    upNextVisible,
    upNextCount,
    setUpNextVisible,
    autoplayNext,
    setAutoplayNext,
    current,
    currentId,
    setCurrentId,
    watchPos,
    setWatchPos,
  };
}
