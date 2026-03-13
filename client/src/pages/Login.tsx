import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, googleLogin as googleLoginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import AuthVideoBackground from "../components/AuthVideoBackground";
import "../index.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const data = await loginUser(email, password);
      login(data.token);
      navigate("/chat");
    } catch {
      setError("Invalid credentials");
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError("");
    try {
      const data = await googleLoginApi(credentialResponse.credential);
      login(data.token);
      navigate("/chat");
    } catch {
      setError("Google login failed. Please try again.");
    }
  };

  return (
    <AuthVideoBackground>
      <form
        onSubmit={handleSubmit}
        className="
          relative
          bg-white/10
          backdrop-blur-xl
          p-8
          rounded-2xl
          w-80
          shadow-2xl
          border
          border-white/20
          animate-[float_6s_ease-in-out_infinite]
          before:absolute
          before:inset-0
          before:rounded-2xl
          before:bg-gradient-to-r
          before:from-blue-500/30
          before:via-purple-500/30
          before:to-pink-500/30
          before:blur-xl
          before:-z-10
          hover:shadow-[0_0_40px_rgba(139,92,246,0.6)]
          transition
          duration-300
        "
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-white">
          Login
        </h2>

        {error && (
          <p className="text-red-400 text-sm mb-3 text-center">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="
            w-full mb-4 p-2 rounded
            bg-white/20 text-white
            placeholder-white/70
            focus:outline-none
            focus:ring-2 focus:ring-blue-400
          "
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="
            w-full mb-5 p-2 rounded
            bg-white/20 text-white
            placeholder-white/70
            focus:outline-none
            focus:ring-2 focus:ring-purple-400
          "
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="
            w-full py-2 rounded
            bg-gradient-to-r from-blue-500 to-purple-600
            text-white font-semibold
            hover:opacity-90
            transition
          "
        >
          Login
        </button>

        {/* ── Google Sign-In Divider ── */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-white/30"></div>
          <span className="px-3 text-white/60 text-sm">or</span>
          <div className="flex-1 h-px bg-white/30"></div>
        </div>

        {/* ── Google Sign-In Button ── */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google login failed")}
            theme="filled_black"
            shape="pill"
            size="large"
            width="250"
            text="signin_with"
          />
        </div>

        <p className="text-sm text-center mt-4 text-white/80">
          Don't have an account?{" "}
          <span
            className="text-blue-300 cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </form>
    </AuthVideoBackground>
  );
};

export default Login;

