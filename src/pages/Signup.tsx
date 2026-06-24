import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Building2, Mail, Lock, AlertCircle, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { API_URL } from "../utils/constants";

export default function Signup() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: "", color: "" };
    if (pwd.length < 6) return { strength: 1, label: "Weak", color: "bg-red-500" };
    if (pwd.length < 10) return { strength: 2, label: "Fair", color: "bg-yellow-500" };
    if (pwd.length < 12 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return { strength: 3, label: "Good", color: "bg-red-500" };
    }
    return { strength: 4, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    // Validation
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/signup`, {
        companyName,
        email,
        password,
      });

      // Success - redirect to login
      navigate("/login", {
        state: { message: "Signup successful! Please login to continue." }
      });
    } catch (e: any) {
      console.error("Signup error:", e);
      setError(e.response?.data?.error || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSignup();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-red-500 to-red-500 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-gray-400">Join AirStream and start streaming</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#181818] rounded-2xl p-8 border border-gray-800">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Company Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Your Company"
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors text-white placeholder:text-gray-400"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  autoComplete="organization"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors text-white placeholder:text-gray-400"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-black/50 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors text-white placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength.strength
                            ? passwordStrength.color
                            : "bg-[#1a0000]"
                          }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <p className="text-xs text-gray-400">
                      Password strength: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-black/50 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 transition-colors text-white placeholder:text-gray-400"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-2">
                  {password === confirmPassword ? (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Passwords match
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Passwords do not match
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              onClick={handleSignup}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Creating account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#181818] text-gray-400">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            to="/login"
            className="block w-full text-center py-3 border border-gray-700 hover:border-red-500 rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          By creating an account, you agree to our{" "}
          <Link to="/terms" className="text-red-500 hover:text-red-500">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-red-500 hover:text-red-500">
            Privacy Policy
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

