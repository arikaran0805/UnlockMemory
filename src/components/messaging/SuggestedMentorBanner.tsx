import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, User } from "lucide-react";
import type { ResolvedOwner } from "@/hooks/useDoubtSystem";

interface SuggestedMentorBannerProps {
  mentor: ResolvedOwner;
  context: { source_type: string; source_title: string };
  variant: "list" | "chat";
  onAsk: () => void;
}

const roleLabels: Record<string, string> = {
  moderator: "Moderator",
  senior_moderator: "Senior Moderator",
  super_moderator: "Super Moderator",
};

export function SuggestedMentorBanner({ mentor, context, variant, onAsk }: SuggestedMentorBannerProps) {
  if (variant === "chat") {
    return (
      <div className="px-3 py-2 border-t border-border/20 bg-primary/5">
        <button
          onClick={onAsk}
          className="w-full flex items-center gap-2.5 text-left group"
        >
          <Avatar className="h-7 w-7 border border-primary/20 flex-shrink-0">
            {mentor.avatar_url ? <AvatarImage src={mentor.avatar_url} alt={mentor.user_name} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
              {mentor.user_name?.charAt(0)?.toUpperCase() || <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight">
              Lesson mentor: <span className="font-medium text-foreground">{mentor.user_name}</span>
            </p>
          </div>
          <span className="text-[11px] font-medium text-primary group-hover:underline flex-shrink-0">
            Ask instead
          </span>
        </button>
      </div>
    );
  }

  // List variant - shown at top of connection list
  return (
    <div className="mx-4 mb-2">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Suggested for this lesson
        </p>
        <button
          onClick={onAsk}
          className="w-full flex items-center gap-2.5 group"
        >
          <Avatar className="h-9 w-9 border border-primary/20 flex-shrink-0">
            {mentor.avatar_url ? <AvatarImage src={mentor.avatar_url} alt={mentor.user_name} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {mentor.user_name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">{mentor.user_name}</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">
              {roleLabels[mentor.role] || mentor.role}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-primary flex-shrink-0">
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium group-hover:underline">Ask</span>
          </div>
        </button>
      </div>
    </div>
  );
}
