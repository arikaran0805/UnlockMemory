import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDoubtSystem, type DoubtSourceContext } from "@/hooks/useDoubtSystem";
import { useMessaging } from "@/hooks/useMessaging";
import { AskDoubtDrawer } from "./AskDoubtDrawer";
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
  const { isSubmitting, submitDoubt } = useDoubtSystem(userId);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (!userId) {
      toast.error("Please sign in to ask a doubt");
      return;
    }
    setDrawerOpen(true);
  }, [userId]);

  const handleSubmit = useCallback(async (message: string) => {
    const result = await submitDoubt(context, message);
    if (result) {
      setDrawerOpen(false);
      // Open chat with the assigned mentor
      if (messaging) {
        messaging.openChat(result.connectionId);
      }
    }
  }, [context, submitDoubt, messaging]);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        <HelpCircle className="h-3.5 w-3.5 mr-2" />
        {label}
      </Button>

      <AskDoubtDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        context={context}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  );
}
