import { Trash2, Send, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecordingBarProps {
  isRecording: boolean;
  duration: number;
  onStop: () => void;
  onCancel: () => void;
  onSend?: () => void;
  hasRecording: boolean;
}

export function VoiceRecordingBar({
  isRecording,
  duration,
  onStop,
  onCancel,
  onSend,
  hasRecording,
}: VoiceRecordingBarProps) {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-t border-border/30 px-3 py-2.5">
      <div className="flex items-center gap-3 bg-muted/25 rounded-2xl px-4 py-3 border border-border/20">
        {/* Cancel */}
        <button
          onClick={onCancel}
          className="p-1.5 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
          title="Cancel recording"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Recording indicator / Timer */}
        <div className="flex-1 flex items-center gap-2.5">
          {isRecording && (
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            </div>
          )}
          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatTime(duration)}
          </span>

          {isRecording && (
            <div className="flex-1 flex items-center gap-[2px] overflow-hidden">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full bg-destructive/40"
                  style={{
                    height: `${Math.random() * 60 + 20}%`,
                    animationDelay: `${i * 50}ms`,
                    maxHeight: "16px",
                    minHeight: "3px",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stop / Send */}
        {isRecording ? (
          <button
            onClick={onStop}
            className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            title="Stop recording"
          >
            <div className="w-3.5 h-3.5 rounded-sm bg-primary-foreground" />
          </button>
        ) : hasRecording && onSend ? (
          <button
            onClick={onSend}
            className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            title="Send voice message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
