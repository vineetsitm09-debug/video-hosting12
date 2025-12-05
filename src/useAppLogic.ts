import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoItem } from "./types";
import { clamp } from "./utils/format";
import { useAuth } from "./context/AuthContext"; // ✅ Import Auth Context
import { getAuth } from "firebase/auth";

// 🌍 Backend API endpoint
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ✅ Get logged-in company info + token
  const { token } = useAuth();

  // 🎬 Watch position (saved locally)
  const [watchPos, setWatchPos] = useState<Record<string, { t: number; d: number }>>(() => {
    try {
      return JSON.parse(localStorage.getItem("watchPos") || "{}");
    } catch {
      return {};
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // “Up Next” overlay logic
  const [upNextVisible, setUpNextVisible] = useState(false);
  const [upNextCount, setUpNextCount] = useState(5);

  // ---------------- FETCH VIDEOS ----------------
const fetchVideos = async () => {
  try {
    const res = await fetch(`${API_URL}/videos`, {
      headers: {
        Authorization: `Bearer ${token}`, // ✅ Send JWT Token
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json(); // The response is { success: boolean, videos: VideoItem[] }

    // 🛑 FIX: Ensure 'videos' property exists and is an array before mapping
    if (!result.videos || !Array.isArray(result.videos)) {
        console.error("Server response structure invalid:", result);
        // Fallback to empty array to prevent application crash
        setVideos([]);
        return;
    }

    // ✅ Normalize all fields - Now mapping over the 'videos' array
    const normalizedVideos: VideoItem[] = result.videos.map((v: any) => ({
      id: v.id || v._id || v.videoId,
      title: v.title || v.name || v.filename || "Untitled Video",
      filename: v.filename || v.title || "Untitled",
      thumbnail:
        v.thumbnail ||
        v.thumb ||
        // 🛑 IMPORTANT: Update thumbnail URL construction to include video ID in the path
        (v.filename ? `${API_URL}/hls/thumbnails/${v.filename}/thumb_0001.jpg` : null),
      thumbnails_base: v.thumbnails_base,
      duration: v.duration || 0,
      uploader: v.uploader || v.uploadedBy || v.uploader_email || "Unknown",
      status: v.status || "ready",
      // 🛑 IMPORTANT: Update video_url to use the HLS stream path with filename
      video_url: v.video_url || v.url || `${API_URL}/hls/${v.filename}/master.m3u8`,
    }));

    setVideos(normalizedVideos);

    setCurrentId((prev) => {
      if (prev && normalizedVideos.some((v) => v.id === prev)) return prev;
      const savedId = localStorage.getItem("lastVideoId");
      if (savedId && normalizedVideos.some((v) => v.id === savedId))
        return savedId;
      return normalizedVideos[0]?.id || null;
    });
  } catch (e) {
    console.error("❌ Error fetching videos:", e);
    setToast({ message: "Failed to load videos", type: "error" });
  }
};



  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 30000);
    return () => clearInterval(interval);
  }, [token]); // ✅ Refetch when token changes

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
      setToast({ message: "Please login before uploading", type: "error" });
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/upload`, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`); // ✅ send token

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = async () => {
      setUploading(false);
      if (xhr.status === 200) {
        setToast({ message: "✅ Upload complete! Processing started...", type: "success" });
        await fetchVideos();
      } else {
        setToast({ message: `Upload failed: ${xhr.responseText}`, type: "error" });
      }
      e.target.value = "";
    };

    xhr.onerror = () => {
      setUploading(false);
      setToast({ message: "Network error during upload", type: "error" });
    };

    xhr.send(formData);
  } catch (err) {
    console.error("❌ Upload failed:", err);
    setToast({ message: "Upload failed", type: "error" });
    setUploading(false);
  }
};

  // ---------------- LOCALSTORAGE SYNC ----------------
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
      title: current.title || current.filename || "Untitled Video",
      url: current.video_url || current.url,
      thumbnail: current.thumbnail,
      savedPos: watchPos[current.id] || { t: 0, d: current.duration || 0 },
    };
  }, [current, watchPos]);

  const currentIndex = useMemo(
    () => (currentId ? videos.findIndex((v) => v.id === currentId) : -1),
    [videos, currentId]
  );

  const nextVideo = useMemo(() => {
    if (currentIndex < 0 || videos.length === 0) return null;
    const idx = (currentIndex + 1) % videos.length;
    return videos[idx];
  }, [currentIndex, videos]);

  // ---------------- VIDEO END / "UP NEXT" ----------------
  const handleEnded = () => {
    if (!autoplayNext || !nextVideo) return;
    setUpNextVisible(true);
    setUpNextCount(5);

    // Send analytics for "ended"
    sendAnalytics("ended", currentVideo?.id);
  };

  useEffect(() => {
    if (!upNextVisible || !autoplayNext) return;
    const timer = setInterval(() => {
      setUpNextCount((c) => {
        if (c <= 1) {
          clearInterval(timer);
          if (nextVideo) setCurrentId(nextVideo.id);
          setUpNextVisible(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [upNextVisible, autoplayNext, nextVideo]);

  // ---------------- ANALYTICS ----------------
  const sendAnalytics = async (event: string, videoId?: string) => {
    if (!videoId || !token) return;
    try {
      await fetch(`${API_URL}/api/analytics/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId, event }),
      });
    } catch (err) {
      console.warn("⚠️ Analytics send failed:", err);
    }
  };

  // Track when video starts
  useEffect(() => {
    if (currentVideo?.id) sendAnalytics("play", currentVideo.id);
  }, [currentVideo?.id]);

  // ---------------- THEME CLASS ----------------
  const themeCls =
    theme === "dark"
      ? {
          page: "bg-[#0f0f0f] text-[#e5e5e5]",
          panel: "bg-[#181818] border-white/10",
        }
      : {
          page: "bg-slate-950 text-slate-100",
          panel: "bg-slate-900 border-cyan-500/20",
        };

  // ---------------- RETURN EVERYTHING ----------------
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
    themeCls,
    fileInputRef,
    isFullscreen,
    setIsFullscreen,
    handleEnded,
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
