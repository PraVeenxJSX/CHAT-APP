import { useEffect } from "react";
import { X, Download } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

const ImageLightbox = ({ src, onClose }: ImageLightboxProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <a
          href={src}
          download
          onClick={(e) => e.stopPropagation()}
          className="h-10 w-10 grid place-items-center rounded-full bg-white/[0.08] border border-white/15 text-white/85 hover:bg-white/[0.15] transition"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </a>
        <button
          onClick={onClose}
          className="h-10 w-10 grid place-items-center rounded-full bg-white/[0.08] border border-white/15 text-white/85 hover:bg-white/[0.15] transition"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <img
        src={src}
        alt="Full size"
        className="max-h-[90vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImageLightbox;