import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout>;

    // Listen for auth state changes FIRST — this is the most reliable signal.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsValidSession(true);
      }
    });

    const checkSession = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");

        // PKCE flow: exchange the one-time code for a session.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          navigate("/reset-password", { replace: true });
          if (!cancelled) setIsValidSession(true);
          return;
        }

        // The Supabase client auto-processes hash tokens on init.
        // Give it a moment to complete, then check for an active session.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled && session) {
          setIsValidSession(true);
          return;
        }

        // If no session yet, wait a short time for onAuthStateChange to fire
        // (the client may still be processing hash tokens).
        fallbackTimer = setTimeout(() => {
          if (!cancelled) {
            // If onAuthStateChange hasn't fired by now, session is invalid
            setIsValidSession((prev) => (prev === null ? false : prev));
          }
        }, 3000);
      } catch {
        if (!cancelled) setIsValidSession(false);
      }
    };

    checkSession();

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [navigate]);


  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Now sign in with your new password.",
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Verifying session...</div>
      </div>
    );
  }

  // Invalid/expired session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex bg-background overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md text-center space-y-6">
            <Link to="/" className="flex items-center justify-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <span className="text-2xl font-bold text-primary-foreground">B</span>
              </div>
              <span className="text-2xl font-bold text-foreground">BlogHub</span>
            </Link>

            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-foreground">Link Expired or Invalid</h1>
              <p className="text-muted-foreground">
                This password reset link has expired or is invalid. Please request a new one.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="mt-4"
              >
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-radial from-primary/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-radial from-accent/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:60px_60px] opacity-20" />
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <span className="text-3xl font-black text-primary-foreground">B</span>
            </div>
            <span className="text-3xl font-black text-foreground">BlogHub</span>
          </Link>

          <div className="relative w-80 h-96 mb-12">
            <div className="absolute -left-4 top-6 w-full h-full bg-muted/50 rounded-3xl border border-border rotate-[-8deg]" />
            <div className="absolute -right-4 top-3 w-full h-full bg-muted/30 rounded-3xl border border-border rotate-[5deg]" />
            
            <div className="relative w-full h-full bg-card rounded-3xl border-2 border-primary/20 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <div className="relative p-8 h-full flex flex-col justify-center items-center">
                <div className="text-8xl mb-6">🔐</div>
                <h3 className="text-xl font-bold text-foreground mb-2">Secure Reset</h3>
                <p className="text-muted-foreground text-center">Create a strong new password for your account</p>
              </div>
            </div>
          </div>

          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-foreground mb-3">Almost There!</h2>
            <p className="text-muted-foreground">
              Set your new password and get back to learning.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Reset Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">B</span>
            </div>
            <span className="text-2xl font-bold text-foreground">BlogHub</span>
          </Link>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-black text-foreground mb-2">Set New Password</h1>
              <p className="text-muted-foreground">
                Enter your new password below.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Password"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>

            <div className="text-center">
              <Link 
                to="/auth" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
