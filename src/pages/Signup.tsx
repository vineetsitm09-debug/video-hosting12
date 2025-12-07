import { useState } from "react";

export default function Signup() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Signup failed");
        return;
      }

      alert("Signup successful! Please login.");
    } catch (e) {
      alert("Network error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h2 className="text-2xl mb-4">🎶 Company Signup</h2>

      <input
        placeholder="Company Name"
        className="p-2 m-2 rounded text-black"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
      />

      <input
        placeholder="Email"
        className="p-2 m-2 rounded text-black"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        className="p-2 m-2 rounded text-black"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleSignup} className="bg-pink-500 p-2 rounded mt-2">
        Signup
      </button>
    </div>
  );
}
