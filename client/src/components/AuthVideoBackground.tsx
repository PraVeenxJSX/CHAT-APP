import React from "react";

const AuthVideoBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* 🎥 Blurred Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover scale-105 blur-md"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* 🌑 Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* 🧩 Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuthVideoBackground;
