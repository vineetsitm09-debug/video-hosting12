import { useState } from "react";
import axios from "axios";

export default function Signup() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE}/api/auth/signup`, {
        companyName, email, password
      });
      alert("Signup successful! Please login.");
    } catch (e: any) {
      alert(e.response?.data?.error || "Error signing up");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h2 className="text-2xl mb-4">🎶 Company Signup</h2>
      <input placeholder="Company Name" className="p-2 m-2 rounded text-black"
             value={companyName} onChange={e => setCompanyName(e.target.value)} />
      <input placeholder="Email" className="p-2 m-2 rounded text-black"
             value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" className="p-2 m-2 rounded text-black"
             type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleSignup} className="bg-pink-500 p-2 rounded mt-2">Signup</button>
    </div>
  );
}
