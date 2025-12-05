import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { FiCheckCircle } from "react-icons/fi";
import { ImSpinner8 } from "react-icons/im";

const API_URL = "http://18.218.164.106:5000";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "ready">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const startUpload = async () => {
    if (!file) return alert("Please select a video first!");

    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setStatus("processing");
        startPolling();
      } else {
        alert("Upload failed!");
        setStatus("idle");
      }
    };

    xhr.onerror = () => {
      alert("Network error!");
      setStatus("idle");
    };

    xhr.send(formData);
  };

  const startPolling = async () => {
    const interval = setInterval(async () => {
      const res = await fetch(`${API_URL}/videos`);
      const data = await res.json();
      const latest = data[0];
      if (latest && latest.status === "ready") {
        setStatus("ready");
        clearInterval(interval);
      }
    }, 4000);
  };

  const resetAll = () => {
    setFile(null);
    setPreview("");
    setProgress(0);
    setStatus("idle");
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center py-10 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-400"
      >
        Upload to AirStream Studio
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-3xl bg-[#181818] border border-gray-800 rounded-2xl shadow-xl p-10"
      >
        {/* === Step 1: Drag & Drop Zone === */}
        {status === "idle" && !file && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-16 transition-all cursor-pointer ${
              dragOver
                ? "border-pink-500 bg-pink-500/10"
                : "border-gray-600 hover:border-pink-400"
            }`}
            onClick={() => fileRef.current?.click()}
          >
            <AiOutlineCloudUpload className="text-pink-500 text-6xl mb-4" />
            <p className="text-lg text-gray-300 font-medium">
              Drag & drop video to upload
            </p>
            <p className="text-sm text-gray-500 mt-2">or click to browse files</p>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
            />
          </div>
        )}

        {/* === Step 2: Preview + Upload Button === */}
        {file && status === "idle" && (
          <div className="text-center">
            <video
              src={preview}
              className="w-full rounded-lg border border-gray-700 mb-4 max-h-64 object-cover"
              controls
            />
            <h3 className="text-gray-200">{file.name}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={startUpload}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-2 rounded-md hover:opacity-90"
            >
              Start Upload
            </button>
          </div>
        )}

        {/* === Step 3: Uploading === */}
        {status === "uploading" && (
          <div className="text-center">
            <ImSpinner8 className="animate-spin text-pink-500 text-5xl mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Uploading...</h2>
            <p className="text-gray-400 text-sm mb-4">Please wait while we upload your video</p>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
              />
            </div>
            <p className="text-gray-400 text-sm mt-2">{progress}% uploaded</p>
          </div>
        )}

        {/* === Step 4: Processing === */}
        {status === "processing" && (
          <div className="text-center">
            <ImSpinner8 className="animate-spin text-yellow-400 text-5xl mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-yellow-400">
              Processing your video...
            </h2>
            <p className="text-gray-400 text-sm">
              Hang tight! Your video is being prepared for streaming.
            </p>
          </div>
        )}

        {/* === Step 5: Ready === */}
        {status === "ready" && (
          <div className="text-center">
            <FiCheckCircle className="text-green-400 text-6xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Upload Complete!</h2>
            <p className="text-gray-400 mb-6">Your video is ready to stream.</p>
            <a
              href={`${API_URL}/videos`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2 rounded-md hover:opacity-90"
            >
              ▶ View in Library
            </a>
            <button
              onClick={resetAll}
              className="block mx-auto mt-4 px-4 py-2 text-gray-400 hover:text-pink-400"
            >
              Upload Another
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
