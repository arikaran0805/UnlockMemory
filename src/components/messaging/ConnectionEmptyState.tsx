import { MessageCircle, Users, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectionEmptyStateProps {
  onConnectTeam: () => void;
  isConnecting?: boolean;
}

export function ConnectionEmptyState({ onConnectTeam, isConnecting }: ConnectionEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {/* Icon container */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-[22px] bg-primary/8 flex items-center justify-center">
          <Users className="h-9 w-9 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        Connect to a Team
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px] mb-6">
        To ask questions about this lesson, first connect with your team or mentor.
      </p>

      {/* Actions */}
      <Button
        onClick={onConnectTeam}
        disabled={isConnecting}
        className="w-full max-w-[200px] h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm shadow-sm"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            Connect a Team
            <ArrowRight className="h-4 w-4 ml-1" />
          </>
        )}
      </Button>
      <button className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
        Learn how this works
      </button>
    </div>
  );
}
