interface AvatarProps {
  name: string;
  avatar?: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

const dotClasses = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};

const gradients = [
  ["#5865F2", "#a855f7"],
  ["#06b6d4", "#3b82f6"],
  ["#ec4899", "#8b5cf6"],
  ["#10b981", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#6366f1", "#ec4899"],
];

const gradientFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const [a, b] = gradients[hash % gradients.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

const Avatar = ({ name, avatar, size = "md", online, className = "" }: AvatarProps) => {
  const sizeClass = sizeClasses[size];
  const dotSize = dotClasses[size];

  return (
    <div className={`relative shrink-0 ${className}`}>
      {avatar ? (
        <img
          src={avatar.startsWith("http") ? avatar : `${API_BASE}${avatar}`}
          alt={name}
          className={`${sizeClass} rounded-full object-cover ring-1 ring-white/10`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full grid place-items-center font-semibold text-white ring-1 ring-white/10`}
          style={{ background: gradientFor(name) }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${dotSize} rounded-full border-2 border-[#0b0d12] ${
            online ? "bg-emerald-400" : "bg-white/25"
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;