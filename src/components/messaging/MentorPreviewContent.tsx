import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, HelpCircle, Loader2, MessageCircle, User } from "lucide-react";
import type { ResolvedOwner } from "@/hooks/useDoubtSystem";

interface MentorPreviewContentProps {
  mentor: ResolvedOwner;
  context: { source_type: string; source_title: string };
  isConnecting: boolean;
  onStartConversation: () => void;
}

const sourceIcons: Record<string, typeof BookOpen> = {
  lesson: BookOpen,
  post: FileText,
  course: BookOpen,
  quiz: HelpCircle,
  practice: HelpCircle,
  bookmark: BookOpen,
};

const roleLabels: Record<string, string> = {
  moderator: "Moderator",
  senior_moderator: "Senior Moderator",
  super_moderator: "Super Moderator",
};

export function MentorPreviewContent({ mentor, context, isConnecting, onStartConversation }: MentorPreviewContentProps) {
  const Icon = sourceIcons[context.source_type] || HelpCircle;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Source Context */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5 space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground capitalize">{context.source_type}</p>
              <p className="text-sm font-medium text-foreground line-clamp-2">{context.source_title}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-background/50">
            Context will be shared with mentor
          </Badge>
        </div>

        {/* Mentor Profile */}
        <div className="flex flex-col items-center text-center space-y-3 py-3">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            {mentor.avatar_url ? (
              <AvatarImage src={mentor.avatar_url} alt={mentor.user_name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {mentor.user_name?.charAt(0)?.toUpperCase() || <User className="h-6 w-6" />}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{mentor.user_name}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {roleLabels[mentor.role] || mentor.role}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
            This mentor is assigned to help you with this content. Start a conversation to ask your doubt.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-3 border-t border-border/30 bg-muted/10">
        <Button
          onClick={onStartConversation}
          disabled={isConnecting}
          className="w-full"
          size="sm"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <MessageCircle className="h-3.5 w-3.5 mr-2" />
              Start Asking
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
