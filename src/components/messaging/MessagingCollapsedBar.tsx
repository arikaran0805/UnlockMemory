import { MessageCircle, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessagingCollapsedBarProps {
  unreadCount: number;
  onExpand: () => void;
}

export function MessagingCollapsedBar({ unreadCount, onExpand }: MessagingCollapsedBarProps) {
  return (
    <button
      onClick={onExpand}
      className={cn(
        "fixed bottom-4 right-4 z-[60]",
        "flex items-center gap-2.5 pl-3.5 pr-3 py-2.5",
        "bg-card/95 backdrop-blur-xl border border-border/30",
        "rounded-2xl shadow-lg hover:shadow-xl",
        "transition-all duration-250 ease-out",
        "hover:-translate-y-0.5",
        "group"
      )}
    >
      <div className="relative">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        {unreadCount > 0 && (
          <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-foreground">Messaging</span>
      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
    </button>
  );
}
