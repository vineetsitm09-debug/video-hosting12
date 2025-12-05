// src/components/LoginButton.tsx
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function LoginButton() {
  const { user, login, logout } = useContext(AuthContext);

  return (
    <div>
     {user ? (
  <div className="flex flex-col items-center gap-2">
    <img
      src={user.photoURL || ""}
      alt="avatar"
      className="w-12 h-12 rounded-full"
    />
    <span className="text-lg font-semibold">{user.displayName}</span>
    <button
      onClick={logout}
      className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
    >
      Logout
    </button>
  </div>
) : (
  <button
    onClick={login}
    className="px-4 py-2 rounded bg-red-600 text-white font-medium"
  >
    Sign in with Google
  </button>
)}

    </div>
  );
}
