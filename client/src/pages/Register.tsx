import { useMemo, useState } from "react";
import { registerUser, googleLogin as googleLoginApi } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import PremiumAuthShell from "../components/PremiumAuthShell";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, Check } from "lucide-react";

const scorePassword = (pw: string) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const strength = useMemo(() => scorePassword(password), [password]);
  const strengthLabel = ["Too short", "Weak", "Okay", "Strong", "Excellent"][strength];
  const strengthColor = [
    "bg-red-500/60",
    "bg-orange-500/70",
    "bg-yellow-500/80",
    "bg-emerald-500/80",
    "bg-emerald-400",
  ][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await registerUser(name, email, password);
      login(data.token);
      navigate("/chat");
    } catch {
      setError("Registration failed. That email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    try {
      const data = await googleLoginApi(credentialResponse.credential);
      login(data.token);
      navigate("/chat");
    } catch {
      setError("Google sign-up failed. Please try again.");
    }
  };

  return (
    <PremiumAuthShell mode="register">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Create your account</h2>
        <p className="mt-2 text-sm text-white/50">
          Free forever for personal use. No credit card required.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-white/60 mb-1.5 block">Full name</label>
          <div className="group relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-white/70 transition" />
            <input
              type="text"
              placeholder="Alex Rivera"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.06] transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-white/60 mb-1.5 block">Email</label>
          <div className="group relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-white/70 transition" />
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.06] transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-white/60 mb-1.5 block">Password</label>
          <div className="group relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-white/70 transition" />
            <input
              type={showPw ? "text" : "password"}
              placeholder="At least 8 characters"
              className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.06] transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white transition"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength ? strengthColor : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-1.5 text-xs text-white/50">{strengthLabel}</div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 text-xs text-white/50 pt-1">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>By continuing you agree to our Terms of Service & Privacy Policy.</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full h-11 rounded-xl bg-gradient-to-b from-[#6b78ff] to-[#5865F2] hover:from-[#7a86ff] hover:to-[#5865F2] text-white font-medium text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
        <>
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="px-3 text-xs text-white/40">or sign up with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-up failed")}
              theme="filled_black"
              shape="pill"
              size="large"
              width="320"
              text="signup_with"
            />
          </div>
        </>
      ) : null}

      <p className="mt-8 text-sm text-center text-white/50">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="text-white hover:text-[#8ab4ff] font-medium transition"
        >
          Sign in
        </button>
      </p>
    </PremiumAuthShell>
  );
};

export default Register;
