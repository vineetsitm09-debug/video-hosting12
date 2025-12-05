import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";

import { AuthProvider } from "./context/AuthContext";
import { SearchProvider } from "./context/SearchContext";

import { useAppLogic } from "./useAppLogic";

import HomeFeed from "./pages/HomeFeed";
import WatchPage from "./pages/Watch";
import UploadPage from "./pages/UploadPage";
import Dashboard from "./pages/Dashboard";

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

  const location = useLocation();
  const [showUploadModal, setShowUploadModal] = React.useState(false);

  return (
    <AuthProvider>
      <SearchProvider>
        <div className={`min-h-screen flex flex-col ${themeCls.page}`}>
          
          {/* HEADER (hidden in fullscreen mode) */}
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

          {/* MAIN LAYOUT */}
          <main
            className={`flex flex-1 w-full ${
              !isFullscreen ? "h-[calc(100vh-64px)]" : "h-screen"
            } px-4 md:px-6 py-4 gap-6 overflow-hidden`}
          >
            {/* SIDEBAR (hidden in fullscreen mode) */}
            {!isFullscreen && <Sidebar themeCls={themeCls} />}

            {/* PAGE CONTENT */}
            <section className="flex-1 flex flex-col min-w-0 relative overflow-y-auto custom-scrollbar">
              <Routes>
                {/* HOME PAGE */}
                <Route
                  path="/"
                  element={
                    <div>
                      <h2 className="text-lg font-semibold mb-4 px-2 text-white">
                        Recommended
                      </h2>
                      <HomeFeed videos={videos} />
                    </div>
                  }
                />

                {/* WATCH PAGE */}
                <Route path="/watch/:id" element={<WatchPage />} />

                {/* UPLOAD PAGE */}
                <Route path="/upload" element={<UploadPage />} />

                {/* DASHBOARD PAGE */}
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </section>
          </main>

          {/* TOAST MESSAGES */}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          {/* MOBILE NAV */}
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
      </SearchProvider>
    </AuthProvider>
  );
}
