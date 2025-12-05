import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import { AuthProvider } from "./context/AuthContext";
import { useAppLogic } from "./useAppLogic";
import UploadPage from "./pages/UploadPage";
import Dashboard from "./pages/Dashboard";
import UploadModal from "./components/UploadModal";
import { SearchProvider } from "./context/SearchContext";

// ✅ Added pages
import HomeFeed from "./pages/HomeFeed";
import WatchPage from "./pages/Watch";

export default function App() {
  const {
    videos,
    toast,
    setToast,
    q,
    setQ,
    theme,
    setTheme,
    themeCls,
    fileInputRef,
    uploading,
    isFullscreen,
  } = useAppLogic();

  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith("/watch");

  return (
    <AuthProvider>
      <div className={`min-h-screen ${themeCls.page} flex flex-col`}>
        {/* Header */}
        {!isFullscreen && (
          <Header
            theme={theme}
            setTheme={setTheme}
            q={q}
            setQ={setQ}
            themeCls={themeCls}
            fileInputRef={fileInputRef}
            handleUploadClick={() => setShowUploadModal(true)}
            uploading={uploading}
          />
        )}

        {/* Main Layout */}
        <main
          className={`flex flex-1 w-full ${
            !isFullscreen ? "h-[calc(100vh-64px)]" : "h-screen"
          } px-4 md:px-6 py-4 gap-6 overflow-hidden`}
        >
          {/* Sidebar (always visible) */}
          {!isFullscreen && (
            <Sidebar
              themeCls={themeCls}
              extraLinks={[
                { name: "🏠 Home", path: "/" },
                { name: "🔥 Trending", path: "/trending" },
                { name: "📚 Library", path: "/library" },
                { name: "⚙️ Settings", path: "/settings" },
              ]}
            />
          )}

          {/* Page Content */}
          <section className="flex-1 flex flex-col min-w-0 relative overflow-y-auto custom-scrollbar">
            <Routes>
              {/* 🏠 Home */}
              <Route
                path="/"
                element={
                  <div className="w-full">
                    <h2 className="text-lg font-semibold mb-4 px-2 text-white">
                      Recommended
                    </h2>
                    <HomeFeed videos={videos} />
                  </div>
                }
              />

              {/* ▶️ Watch Page */}
              <Route path="/watch/:id" element={<WatchPage />} />

              {/* 📤 Upload */}
              <Route path="/upload" element={<UploadPage />} />

              {/* 📊 Dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </section>

        </main>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onUploaded={() => window.location.reload()}
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
          <Link
            to="/dashboard"
            className="text-sm hover:text-pink-400 transition"
          >
            📊 Dashboard
          </Link>
        </div>
      </div>
    </AuthProvider>
  );
}
