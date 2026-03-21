import { X, FileText, Image as ImageIcon, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentPreviewProps {
  file: File;
  previewUrl?: string;
  uploadProgress?: number;
  onRemove: () => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf" || type.includes("document") || type.includes("text")) return FileText;
  return File;
};

export function AttachmentPreview({ file, previewUrl, uploadProgress, onRemove }: AttachmentPreviewProps) {
  const isImage = file.type.startsWith("image/");
  const Icon = getFileIcon(file.type);

  return (
    <div className="border-t border-border/30 px-3 py-2">
      <div className="flex items-center gap-2.5 bg-muted/25 rounded-xl px-3 py-2 border border-border/20 relative">
        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors z-10"
        >
          <X className="h-3 w-3" />
        </button>

        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
          <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
        </div>

        {uploadProgress !== undefined && uploadProgress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/40 rounded-b-xl overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
