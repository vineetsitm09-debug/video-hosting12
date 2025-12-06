// src/context/AuthContext.tsx
import React, { createContext, useEffect, useState, useContext } from "react";
import { auth, signInWithGoogle, logout } from "../firebase";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import type { User } from "firebase/auth";

interface AuthContextProps {
  user: User | null;
  token: string | null;
  login: () => void;
  logout: () => void;
}

// ⭐ FIX: Export AuthContext
export const AuthContext = createContext<AuthContextProps>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const idToken = await getIdToken(firebaseUser, true);
        setToken(idToken);

        setInterval(async () => {
          const refreshedToken = await getIdToken(firebaseUser, true);
          setToken(refreshedToken);
        }, 55 * 60 * 1000);
      } else {
        setToken(null);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login: signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
