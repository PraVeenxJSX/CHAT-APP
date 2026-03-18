import React from "react";

const AuthVideoBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-cyber-bg">
      {/* Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover scale-105 blur-md opacity-40"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay with grid */}
      <div className="absolute inset-0 bg-cyber-bg/80 cyber-grid-bg" />

      {/* Scanline effect */}
      <div className="absolute inset-0 cyber-scanline pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuthVideoBackground;
