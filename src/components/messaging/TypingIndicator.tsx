import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

/**
 * WhatsApp-style 3-dot typing indicator with smooth animations.
 */
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1 px-4 py-2", className)}>
      <div className="flex items-center gap-1 bg-muted/50 border border-border/20 rounded-2xl rounded-bl-lg px-3.5 py-2.5">
        <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/50 animate-typing-1" />
        <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/50 animate-typing-2" />
        <span className="typing-dot w-[6px] h-[6px] rounded-full bg-muted-foreground/50 animate-typing-3" />
      </div>
    </div>
  );
}
