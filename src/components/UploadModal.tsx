import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  X,
  CheckCircle,
  Tag,
  ImagePlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext"; // ✅ Firebase context

export default function UploadModal({ onClose, onUploaded }: any) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("Public");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("Entertainment");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [videoPreview, setVideoPreview] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // ✅ Load Draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem("airstream_draft");
    if (draft) {
      const data = JSON.parse(draft);
      setTitle(data.title || "");
      setDescription(data.description || "");
      setTags(data.tags || "");
      setCategory(data.category || "Entertainment");
      setVisibility(data.visibility || "Public");
    }
  }, []);

  // ✅ Save Draft to backend (optional)
  const handleSaveDraft = async () => {
    try {
      if (!user) return alert("Please sign in first.");
      const token = await user.getIdToken();

      const body = {
        title,
        description,
        tags,
        category,
        visibility,
      };

      const res = await fetch("http://18.218.164.106:5000/api/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Draft saved successfully!");
      } else {
        alert("❌ Failed to save draft.");
      }
    } catch (err) {
      console.error("Draft save error:", err);
      alert("Error saving draft");
    }
  };

  // ✅ Upload Thumbnail
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setThumbnail(selected);
  };

  // ✅ Upload Video + Metadata
  const startUpload = async () => {
    if (!file) return alert("Please select a video file.");
    if (!user) return alert("Please log in first.");

    try {
      setUploading(true);
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("tags", tags);
      formData.append("category", category);
      formData.append("visibility", visibility);

      // ✅ Include custom thumbnail (if selected)
      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "http://18.218.164.106:5000/upload");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 200) {
          setStep(3);
          localStorage.removeItem("airstream_draft");
          onUploaded();
        } else {
          console.error("Upload failed:", xhr.responseText);
          alert("❌ Upload failed. Please check console logs.");
        }
      };

      xhr.onerror = () => {
        alert("❌ Upload failed. Server error.");
        setUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      console.error("Upload error:", err);
      setUploading(false);
    }
  };

 // ✅ Handle file change (auto-fill title, description, and tags)
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selected = e.target.files?.[0];
  if (!selected) return;

  setFile(selected);
  setVideoPreview(URL.createObjectURL(selected));

  // 🧠 Extract base filename
  const baseName = selected.name.replace(/\.[^/.]+$/, "");

  // Auto-fill title if empty
  setTitle((prev) => prev || baseName);

  // Auto-fill tags (from words in file name)
  const autoTags = baseName
    .split(/[-_ ]+/)
    .filter((w) => w.length > 2)
    .slice(0, 5)
    .join(", ");
  setTags((prev) => prev || autoTags);

  // Extract video metadata (duration + resolution)
  const videoEl = document.createElement("video");
  videoEl.preload = "metadata";
  videoEl.src = URL.createObjectURL(selected);

  videoEl.onloadedmetadata = () => {
    const duration = videoEl.duration;
    const width = videoEl.videoWidth;
    const height = videoEl.videoHeight;

    // Format duration as MM:SS
    const minutes = Math.floor(duration / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(duration % 60)
      .toString()
      .padStart(2, "0");

    const autoDescription = `🎬 Video uploaded on AirStream\nFile name: ${selected.name}\nResolution: ${width}x${height}\nDuration: ${minutes}:${seconds}`;
    setDescription((prev) => prev || autoDescription);

    // Clean up memory
    URL.revokeObjectURL(videoEl.src);
  };
};


  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#111] text-white w-[480px] rounded-2xl shadow-xl relative overflow-hidden">
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <X size={22} />
        </button>

        {/* Header */}
        <div className="px-6 pt-5 text-center border-b border-white/10 pb-3">
          <h2 className="text-lg font-semibold">
            {step === 1
              ? "Upload Video"
              : step === 2
              ? "Video Details"
              : "Upload Complete"}
          </h2>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="p-6 flex flex-col items-center">
            {videoPreview && (
              <video src={videoPreview} controls className="w-64 h-36 rounded-md mb-3" />
            )}

            <label
              htmlFor="video-upload"
              className="w-full cursor-pointer border-2 border-dashed border-gray-600 rounded-xl h-28 flex flex-col items-center justify-center text-gray-400 hover:border-pink-500 hover:text-pink-400 transition"
            >
              <UploadCloud size={24} />
              <p className="text-sm mt-1">{file ? file.name : "Drag & drop or click to upload"}</p>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <input
              type="text"
              placeholder="Video title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-4 px-4 py-2 rounded-md bg-gray-900 border border-gray-700 focus:ring-2 focus:ring-pink-500 outline-none"
            />

            <textarea
              placeholder="Description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-3 px-4 py-2 rounded-md bg-gray-900 border border-gray-700 h-20 resize-none focus:ring-2 focus:ring-pink-500 outline-none"
            />

            <div className="flex justify-between w-full mt-5">
              <button
                onClick={() => setStep(2)}
                disabled={!file || !title}
                className="ml-auto bg-pink-600 hover:bg-pink-700 px-6 py-2 rounded-full text-sm font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="p-6">
            <label htmlFor="thumbnail-upload" className="flex items-center gap-2 cursor-pointer mb-4">
              <ImagePlus size={20} className="text-pink-400" />
              <span className="text-sm text-gray-300">Upload Custom Thumbnail</span>
              <input
                id="thumbnail-upload"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
              />
            </label>

            {thumbnail && (
              <img
                src={URL.createObjectURL(thumbnail)}
                alt="Thumbnail preview"
                className="w-full h-40 object-cover rounded-md mb-3"
              />
            )}

            {/* Visibility */}
            <h3 className="text-sm text-gray-300 mb-2">Visibility</h3>
            <div className="flex flex-col gap-2 mb-4">
              {["Public", "Unlisted", "Private"].map((v) => (
                <label
                  key={v}
                  className={`flex items-center gap-2 cursor-pointer p-2 rounded-md ${
                    visibility === v ? "bg-gray-800" : "hover:bg-gray-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                  />
                  <span>{v}</span>
                </label>
              ))}
            </div>

            {/* Tags */}
            <label className="flex items-center gap-2 mb-2 text-sm text-gray-300">
              <Tag size={16} className="text-pink-400" /> Tags
            </label>
            <input
              type="text"
              placeholder="Add tags separated by commas"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 mb-4"
            />

            {/* Buttons */}
            {!uploading ? (
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-white">
                  Back
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDraft}
                    className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-full text-sm font-medium"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={startUpload}
                    className="bg-pink-600 hover:bg-pink-700 px-5 py-2 rounded-full text-sm font-medium"
                  >
                    Upload
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-pink-500 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-center text-sm mt-2 text-gray-400">
                  Uploading... {progress}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-3 animate-bounce" />
            <h3 className="font-medium mb-1">Video Uploaded Successfully!</h3>
            <p className="text-sm text-gray-400 mb-5">
              Your video is saved and published on AirStream 🎬
            </p>
            <button
              onClick={onClose}
              className="bg-pink-600 hover:bg-pink-700 px-6 py-2 rounded-full text-sm font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
