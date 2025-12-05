import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import VideoPlayer from "./components/VideoPlayer";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import { AuthProvider } from "./context/AuthContext";
import { useAppLogic } from "./useAppLogic";
import LibraryPanel from "./components/LibraryPanel";
import UploadPage from "./pages/UploadPage";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const {
    videos,
    currentVideo,
    nextVideo,
    handleUpload,
    uploading,
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
    current,
    currentId,
    setCurrentId,
    watchPos,
    setWatchPos,
  } = useAppLogic();

  return (
    <AuthProvider>
      <div className={`min-h-screen ${themeCls.page}`}>
        {/* Header */}
        {!isFullscreen && (
          <Header
            theme={theme}
            setTheme={setTheme}
            q={q}
            setQ={setQ}
            themeCls={themeCls}
            fileInputRef={fileInputRef}
            handleUpload={handleUpload}
            uploading={uploading}
          />
        )}

        {/* Layout */}
        <main
          className={`flex w-full ${
            !isFullscreen ? "h-[calc(100vh-64px)]" : "h-screen"
          } px-6 py-4 gap-6`}
        >
          {/* Sidebar */}
          {!isFullscreen && (
            <Sidebar
              themeCls={themeCls}
              extraLinks={[
                { name: "🏠 Home", path: "/" },
                { name: "📤 Upload", path: "/upload" },
                { name: "📊 Dashboard", path: "/dashboard" },
              ]}
            />
          )}

          {/* Page Switcher */}
          <section className="flex-1 flex flex-col min-w-0 relative">
            <Routes>
              <Route
                path="/"
                element={
                  currentVideo ? (
                    <VideoPlayer
                      video={currentVideo as any}
                      onProgress={(t, d) =>
                        setWatchPos((w) => ({
                          ...w,
                          [current!.id!]: { t, d },
                        }))
                      }
                      onFullscreenChange={setIsFullscreen}
                      onEnded={handleEnded}
                    />
                  ) : (
                    <div className="p-6 text-gray-400">
                      No video selected. Choose from your library or upload new 🎥
                    </div>
                  )
                }
              />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>

            {/* Up Next Overlay */}
            {upNextVisible && nextVideo && (
              <div className="absolute right-4 bottom-24 bg-black/80 text-white px-3 py-2 rounded-lg z-50">
                Up next: {nextVideo.title} in {upNextCount}s
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setUpNextVisible(false)}
                    className="px-2 py-1 bg-white/10 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCurrentId(nextVideo.id);
                      setUpNextVisible(false);
                    }}
                    className="px-2 py-1 bg-red-600 rounded"
                  >
                    Play now
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Library */}
          {!isFullscreen && (
            <section className="w-80 hidden md:block">
              <LibraryPanel
                videos={videos}
                currentId={currentId}
                setCurrentId={setCurrentId}
                watchPos={watchPos}
                themeCls={themeCls}
              />
            </section>
          )}
        </main>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#111]/90 text-white flex justify-around items-center py-3 border-t border-gray-800 md:hidden">
          <Link to="/" className="text-sm hover:text-pink-400 transition">
            🏠 Home
          </Link>
          <Link to="/upload" className="text-sm hover:text-pink-400 transition">
            📤 Upload
          </Link>
          <Link to="/dashboard" className="text-sm hover:text-pink-400 transition">
            📊 Dashboard
          </Link>
        </div>
      </div>
    </AuthProvider>
  );
}
