import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolveOwner, type DoubtSourceContext } from "@/hooks/useDoubtSystem";
import { useMessaging } from "@/hooks/useMessaging";
import { toast } from "sonner";
import { useState } from "react";

interface AskDoubtButtonProps {
  context: DoubtSourceContext;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
  messaging?: ReturnType<typeof useMessaging>;
}

export function AskDoubtButton({
  context,
  variant = "outline",
  size = "sm",
  className,
  label = "Ask a Doubt",
  messaging,
}: AskDoubtButtonProps) {
  const { userId } = useAuth();
  const [isResolving, setIsResolving] = useState(false);

  const handleClick = useCallback(async () => {
    if (!userId) {
      toast.error("Please sign in to ask a doubt");
      return;
    }
    if (!messaging) {
      toast.error("Messaging not available");
      return;
    }
    setIsResolving(true);
    try {
      const resolved = await resolveOwner(context);
      if (!resolved) {
        toast.error("Could not find a mentor for this content");
        return;
      }
      messaging.showMentorPreview(resolved, {
        source_type: context.source_type,
        source_title: context.source_title,
      });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsResolving(false);
    }
  }, [userId, context, messaging]);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isResolving}
    >
      {isResolving ? (
        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
      ) : (
        <HelpCircle className="h-3.5 w-3.5 mr-2" />
      )}
      {isResolving ? "Finding mentor..." : label}
    </Button>
  );
}
