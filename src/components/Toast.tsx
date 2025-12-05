// src/components/Toast.tsx
import React, { useEffect } from "react";

export default function Toast({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000); // auto-hide after 3s
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white text-sm flex items-center gap-2 transition-opacity ${
        type === "success" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {type === "success" ? "✅" : "❌"} {message}
    </div>
  );
}
