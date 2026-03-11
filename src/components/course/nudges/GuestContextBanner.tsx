import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "guest_banner_dismissed";

interface GuestContextBannerProps {
  className?: string;
}

/**
 * Subtle banner encouraging guests to sign in
 * Dismissible - won't reappear in same session
 */
export const GuestContextBanner = ({ className = "" }: GuestContextBannerProps) => {
  const location = useLocation();
  const redirectParam = encodeURIComponent(location.pathname + location.search);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className={`bg-muted/60 border border-border/50 rounded-lg px-4 py-3 flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="text-sm">
          <span className="text-foreground font-medium">You're learning as a guest</span>
          <span className="text-muted-foreground ml-1">· Sign in to track progress and continue where you left off.</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button asChild variant="default" size="sm">
          <Link to={`/login?redirect=${redirectParam}`}>Sign in</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/signup?redirect=${redirectParam}`}>Create free account</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default GuestContextBanner;
