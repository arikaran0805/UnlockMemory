import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Send, BookOpen, FileText, HelpCircle, Loader2 } from "lucide-react";
import type { DoubtSourceContext } from "@/hooks/useDoubtSystem";

interface AskDoubtDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: DoubtSourceContext;
  isSubmitting: boolean;
  onSubmit: (message: string) => void;
}

const sourceIcons: Record<string, typeof BookOpen> = {
  lesson: BookOpen,
  post: FileText,
  course: BookOpen,
  quiz: HelpCircle,
  practice: HelpCircle,
  bookmark: BookOpen,
};

export function AskDoubtDrawer({ open, onOpenChange, context, isSubmitting, onSubmit }: AskDoubtDrawerProps) {
  const [message, setMessage] = useState("");
  const Icon = sourceIcons[context.source_type] || HelpCircle;

  const handleSubmit = () => {
    if (!message.trim() || isSubmitting) return;
    onSubmit(message.trim());
    setMessage("");
  };

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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Context Card */}
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

          {/* Message Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your Question</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your doubt clearly... What are you confused about? What have you tried?"
              className="min-h-[140px] resize-none bg-muted/20 border-border/30 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/30 bg-muted/10">
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Routing your doubt...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Doubt
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
