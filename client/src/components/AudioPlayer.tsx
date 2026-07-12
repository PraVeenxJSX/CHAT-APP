import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
}

const AudioPlayer = ({ src }: AudioPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState("0:00");
  const [currentTime, setCurrentTime] = useState("0:00");

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(255,255,255,0.35)",
      progressColor: "rgba(255,255,255,0.9)",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 32,
      normalize: true,
    });
    ws.load(src);
    ws.on("ready", () => setDuration(formatTime(ws.getDuration())));
    ws.on("audioprocess", () => setCurrentTime(formatTime(ws.getCurrentTime())));
    ws.on("finish", () => setPlaying(false));
    wavesurferRef.current = ws;
    return () => {
      ws.destroy();
    };
  }, [src]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
      setPlaying(!playing);
    }
  };

  return (
    <div className="flex items-center gap-3 min-w-[220px] max-w-[300px]">
      <button
        onClick={togglePlay}
        className="shrink-0 h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center transition"
      >
        {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div ref={containerRef} />
        <div className="flex justify-between text-[10px] text-white/60">
          <span>{currentTime}</span>
          <span>{duration}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;