import { X, Download } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <a
          href={src}
          download
          onClick={(e) => e.stopPropagation()}
          className="p-2 rounded-full bg-background/80 border border-border/30 text-foreground hover:bg-muted transition-colors shadow-lg"
        >
          <Download className="h-4 w-4" />
        </a>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-background/80 border border-border/30 text-foreground hover:bg-muted transition-colors shadow-lg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <img
        src={src}
        alt={alt || "Image preview"}
        className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
