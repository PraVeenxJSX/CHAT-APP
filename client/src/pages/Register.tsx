import { useState } from "react";
import { registerUser, googleLogin as googleLoginApi } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import AuthVideoBackground from "../components/AuthVideoBackground";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const data = await registerUser(name, email, password);
      login(data.token);
      navigate("/chat");
    } catch {
      setError("Registration failed");
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
    <AuthVideoBackground>
      <form
        onSubmit={handleSubmit}
        className="
          relative
          bg-cyber-surface/80
          backdrop-blur-xl
          p-8
          rounded-2xl
          w-80
          shadow-2xl
          border
          border-cyber-border
          animate-[float_6s_ease-in-out_infinite]
          before:absolute
          before:inset-0
          before:rounded-2xl
          before:bg-gradient-to-r
          before:from-cyber-lime/20
          before:via-cyber-cyan/20
          before:to-cyber-purple/20
          before:blur-xl
          before:-z-10
          hover:shadow-neon-lime
          transition-all
          duration-500
        "
      >
        <h2 className="text-2xl font-bold mb-1 text-center text-cyber-lime font-cyber tracking-wider neon-text-cyan">
          NEONCHAT
        </h2>
        <p className="text-cyber-text-dim text-sm text-center mb-6">Create your account</p>

        {error && (
          <p className="text-cyber-magenta text-sm mb-3 text-center neon-text-magenta">
            {error}
          </p>
        )}

        <input
          type="text"
          placeholder="Name"
          className="
            w-full mb-4 p-3 rounded-lg
            bg-cyber-bg border border-cyber-border
            text-cyber-text placeholder-cyber-text-dim
            focus:outline-none focus:border-cyber-lime
            focus:shadow-neon-lime
            transition-all duration-300
          "
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="
            w-full mb-4 p-3 rounded-lg
            bg-cyber-bg border border-cyber-border
            text-cyber-text placeholder-cyber-text-dim
            focus:outline-none focus:border-cyber-cyan
            focus:shadow-neon-cyan
            transition-all duration-300
          "
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="
            w-full mb-5 p-3 rounded-lg
            bg-cyber-bg border border-cyber-border
            text-cyber-text placeholder-cyber-text-dim
            focus:outline-none focus:border-cyber-purple
            focus:shadow-neon-purple
            transition-all duration-300
          "
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="
            w-full py-3 rounded-lg
            bg-gradient-to-r from-cyber-lime to-cyber-cyan
            text-cyber-bg font-bold font-cyber tracking-wider
            hover:shadow-neon-lime
            active:scale-[0.98]
            transition-all duration-300
          "
        >
          REGISTER
        </button>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-cyber-border"></div>
          <span className="px-3 text-cyber-text-dim text-sm">or</span>
          <div className="flex-1 h-px bg-cyber-border"></div>
        </div>

        {/* Google Sign-In */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-up failed")}
            theme="filled_black"
            shape="pill"
            size="large"
            width="250"
            text="signup_with"
          />
        </div>

        <p className="text-sm text-center mt-4 text-cyber-text-dim">
          Already have an account?{" "}
          <span
            className="text-cyber-cyan cursor-pointer hover:underline hover:text-cyber-magenta transition-colors"
            onClick={() => navigate("/")}
          >
            Login
          </span>
        </p>
      </form>
    </AuthVideoBackground>
  );
};

export default Register;
