import { useState } from "react";
import { registerUser } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
      login(data.token); // ✅ IMPORTANT
      navigate("/chat");
    } catch {
      setError("Registration failed");
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
          before:from-green-500/30
          before:via-emerald-500/30
          before:to-teal-500/30
          before:blur-xl
          before:-z-10
          hover:shadow-[0_0_40px_rgba(16,185,129,0.6)]
          transition
          duration-300
        "
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-white">
          Register
        </h2>

        {error && (
          <p className="text-red-400 text-sm mb-3 text-center">
            {error}
          </p>
        )}

        <input
          type="text"
          placeholder="Name"
          className="
            w-full mb-4 p-2 rounded
            bg-white/20 text-white
            placeholder-white/70
            focus:outline-none
            focus:ring-2 focus:ring-green-400
          "
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email"
          className="
            w-full mb-4 p-2 rounded
            bg-white/20 text-white
            placeholder-white/70
            focus:outline-none
            focus:ring-2 focus:ring-emerald-400
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
            focus:ring-2 focus:ring-teal-400
          "
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="
            w-full py-2 rounded
            bg-gradient-to-r from-green-500 to-emerald-600
            text-white font-semibold
            hover:opacity-90
            transition
          "
        >
          Register
        </button>

        <p className="text-sm text-center mt-4 text-white/80">
          Already have an account?{" "}
          <span
            className="text-green-300 cursor-pointer hover:underline"
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
