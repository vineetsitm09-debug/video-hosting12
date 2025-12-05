import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_BASE}/api/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      alert("Login successful!");
      navigate("/");
    } catch (e: any) {
      alert(e.response?.data?.error || "Error logging in");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h2 className="text-2xl mb-4">🎥 Company Login</h2>
      <input placeholder="Email" className="p-2 m-2 rounded text-black"
             value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Password" className="p-2 m-2 rounded text-black"
             type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin} className="bg-pink-500 p-2 rounded mt-2">Login</button>
    </div>
  );
}
