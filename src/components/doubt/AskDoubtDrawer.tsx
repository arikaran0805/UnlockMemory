import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, FileText, HelpCircle, Loader2, MessageCircle, User } from "lucide-react";
import type { DoubtSourceContext, ResolvedOwner } from "@/hooks/useDoubtSystem";

interface AskDoubtDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: DoubtSourceContext;
  mentor: ResolvedOwner | null;
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
  moderator: "Content Moderator",
  senior_moderator: "Course Manager",
  super_moderator: "Career Manager",
};

export function AskDoubtDrawer({ open, onOpenChange, context, mentor, isConnecting, onStartConversation }: AskDoubtDrawerProps) {
  const Icon = sourceIcons[context.source_type] || HelpCircle;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/30">
          <SheetTitle className="text-base font-semibold flex items-center gap-2">
            <HelpCircle className="h-4.5 w-4.5 text-primary" />
            Ask a Doubt
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Your question will be sent to the right mentor automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {/* Source Context */}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground capitalize">{context.source_type}</p>
                <p className="text-sm font-medium text-foreground line-clamp-2">{context.source_title}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-background/50">
              Context will be shared with mentor
            </Badge>
          </div>

          {/* Mentor Profile */}
          {mentor && (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                {mentor.avatar_url ? (
                  <AvatarImage src={mentor.avatar_url} alt={mentor.user_name} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {mentor.user_name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">{mentor.user_name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {roleLabels[mentor.role] || mentor.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-[260px]">
                This mentor is assigned to help you with this content. Start a conversation to ask your doubt.
              </p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-border/30 bg-muted/10">
          <Button
            onClick={onStartConversation}
            disabled={isConnecting || !mentor}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Start Asking
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
