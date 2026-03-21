import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDoubtSystem, type DoubtSourceContext, type ResolvedOwner } from "@/hooks/useDoubtSystem";
import { useMessaging } from "@/hooks/useMessaging";
import { AskDoubtDrawer } from "./AskDoubtDrawer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const { routeDoubt } = useDoubtSystem(userId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mentor, setMentor] = useState<ResolvedOwner | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleClick = useCallback(async () => {
    if (!userId) {
      toast.error("Please sign in to ask a doubt");
      return;
    }
    setIsResolving(true);
    try {
      // Resolve mentor without creating connection
      const { resolveOwner } = await import("@/hooks/useDoubtSystem");
      const resolved = await resolveOwner(context);
      if (!resolved) {
        toast.error("Could not find a mentor for this content");
        return;
      }
      setMentor(resolved);
      setDrawerOpen(true);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsResolving(false);
    }
  }, [userId, context]);

  const handleStartConversation = useCallback(async () => {
    if (!messaging || !userId) return;
    setIsConnecting(true);
    try {
      const result = await routeDoubt(context);
      if (result) {
        setDrawerOpen(false);
        messaging.fetchConnections();
        messaging.openChat(result.connectionId);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [messaging, userId, context, routeDoubt]);

  return (
    <>
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

      <AskDoubtDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        context={context}
        mentor={mentor}
        isConnecting={isConnecting}
        onStartConversation={handleStartConversation}
      />
    </>
  );
}
