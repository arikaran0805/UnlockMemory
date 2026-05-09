import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "guest_banner_dismissed";

interface GuestContextBannerProps {
  className?: string;
}

/**
 * Guest sign-in bar — matches the lesson footer style.
 * Dismissible within the session.
 */
export const GuestContextBanner = ({ className = "" }: GuestContextBannerProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectParam = encodeURIComponent(location.pathname + location.search);

  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setDismissed(true);
  };

  const handleGoogleSignIn = useCallback(async () => {
    const redirectTo = `${window.location.origin}${location.pathname}${location.search}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }, [location.pathname, location.search]);

  if (dismissed) return null;

  return (
    <div className={`flex items-center gap-4 py-3 px-1 ${className}`}>
      {/* Progress track — tiny green start-cap on a grey rail */}
      <div className="flex-1 h-[5px] bg-muted/50 rounded-full overflow-hidden min-w-0 hidden sm:block">
        <div className="h-full w-10 bg-primary rounded-full" />
      </div>

      {/* Sign-in prompt */}
      <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
        <span className="text-sm whitespace-nowrap select-none">
          <button
            onClick={() => navigate(`/login?redirect=${redirectParam}`)}
            className="text-primary font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            Sign in
          </button>
          <span className="text-muted-foreground"> to track your progress</span>
        </span>

        <div className="w-px h-4 bg-border flex-shrink-0" />

        {/* OAuth icon buttons */}
        <div className="flex items-center gap-2">
          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            aria-label="Sign in with Google"
            className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-all duration-150 hover:scale-105"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>

          {/* GitHub */}
          <button
            onClick={() => navigate("/login")}
            aria-label="Sign in with GitHub"
            className="h-8 w-8 rounded-full flex items-center justify-center bg-[#24292e] hover:bg-[#1b1f23] transition-all duration-150 hover:scale-105"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </button>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ml-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default GuestContextBanner;
