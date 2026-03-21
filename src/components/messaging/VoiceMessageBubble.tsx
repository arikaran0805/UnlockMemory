import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessageBubbleProps {
  url: string;
  duration: number;
  isOwn: boolean;
}

export function VoiceMessageBubble({ url, duration, isOwn }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
      cancelAnimationFrame(animRef.current);
    };
  }, [url]);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;
    const dur = audio.duration || duration;
    setProgress((audio.currentTime / dur) * 100);
    setCurrentTime(audio.currentTime);
    animRef.current = requestAnimationFrame(updateProgress);
  }, [isPlaying, duration]);

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, updateProgress]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.playbackRate = playbackRate;
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = audio.duration || duration;
    audio.currentTime = pct * dur;
    setProgress(pct * 100);
    setCurrentTime(audio.currentTime);
  };

  const cycleSpeed = () => {
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const displayTime = isPlaying || currentTime > 0 ? currentTime : duration;

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <button
        onClick={togglePlay}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
          isOwn
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
            : "bg-primary/10 hover:bg-primary/20"
        )}
      >
        {isPlaying ? (
          <Pause className={cn("h-3.5 w-3.5", isOwn ? "text-primary-foreground" : "text-primary")} />
        ) : (
          <Play className={cn("h-3.5 w-3.5 ml-0.5", isOwn ? "text-primary-foreground" : "text-primary")} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* Waveform / progress bar */}
        <div
          className="h-6 flex items-center gap-[2px] cursor-pointer"
          onClick={handleSeek}
        >
          {Array.from({ length: 28 }).map((_, i) => {
            const barPct = (i / 28) * 100;
            const isActive = barPct <= progress;
            // Pseudo-random heights for waveform effect
            const heights = [40, 70, 55, 85, 45, 90, 60, 75, 50, 80, 65, 95, 55, 70, 85, 45, 60, 90, 50, 75, 65, 80, 55, 70, 85, 45, 60, 95];
            const h = heights[i % heights.length];
            return (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-150",
                  isActive
                    ? isOwn ? "bg-primary-foreground/90" : "bg-primary"
                    : isOwn ? "bg-primary-foreground/25" : "bg-muted-foreground/25"
                )}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <span className={cn("text-[10px]", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
            {formatTime(displayTime)}
          </span>
          <button
            onClick={cycleSpeed}
            className={cn(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded-md transition-colors",
              isOwn
                ? "bg-primary-foreground/15 text-primary-foreground/70 hover:bg-primary-foreground/25"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}
