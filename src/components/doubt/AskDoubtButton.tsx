import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDoubtSystem, type DoubtSourceContext } from "@/hooks/useDoubtSystem";
import { useMessaging } from "@/hooks/useMessaging";
import { toast } from "sonner";

interface AskDoubtButtonProps {
  context: DoubtSourceContext;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
  /** Messaging instance from parent - if provided, will open chat directly */
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
  const { isSubmitting, routeDoubt } = useDoubtSystem(userId);

  const handleClick = useCallback(async () => {
    if (!userId) {
      toast.error("Please sign in to ask a doubt");
      return;
    }
    if (!messaging) {
      toast.error("Messaging not available");
      return;
    }

    const result = await routeDoubt(context);
    if (result) {
      // Refresh connections and open chat directly
      messaging.fetchConnections();
      messaging.openChat(result.connectionId);
    }
  }, [userId, context, routeDoubt, messaging]);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
      ) : (
        <HelpCircle className="h-3.5 w-3.5 mr-2" />
      )}
      {isSubmitting ? "Connecting..." : label}
    </Button>
  );
}
