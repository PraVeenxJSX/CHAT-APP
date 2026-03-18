interface AvatarProps {
  name: string;
  avatar?: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

const onlineDotSizes = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

const getColorFromName = (name: string) => {
  const colors = [
    "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/40",
    "bg-cyber-magenta/20 text-cyber-magenta border-cyber-magenta/40",
    "bg-cyber-purple/20 text-cyber-purple border-cyber-purple/40",
    "bg-cyber-lime/20 text-cyber-lime border-cyber-lime/40",
    "bg-cyber-blue/20 text-cyber-blue border-cyber-blue/40",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

const Avatar = ({ name, avatar, size = "md", online, className = "" }: AvatarProps) => {
  const sizeClass = sizeClasses[size];
  const colorClass = getColorFromName(name);
  const dotSize = onlineDotSizes[size];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {avatar ? (
        <img
          src={avatar.startsWith("http") ? avatar : `${API_BASE}${avatar}`}
          alt={name}
          className={`${sizeClass} rounded-full object-cover border-2 border-cyber-cyan/30`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center font-bold border-2 ${colorClass}`}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotSize} rounded-full border-2 border-cyber-bg ${
            online
              ? "bg-cyber-lime shadow-neon-lime"
              : "bg-cyber-text-dim"
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;
