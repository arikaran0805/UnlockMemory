/**
 * Login Page - Unified Sign In for all users
 * 
 * Route: /login
 * All roles use this single entry point.
 * Redirects based on active role after successful login.
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Github, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { saveRedirectPath, peekRedirectPath, resolvePostAuthRedirect, clearRedirectPath, isValidRedirectPath } from "@/lib/authRedirect";

const Login = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const roleChangedReason = searchParams.get("reason") === "role_changed";
  const unauthorizedReason = searchParams.get("reason") === "unauthorized";
  const redirectParam = searchParams.get("redirect");
  const safeRedirectParam = isValidRedirectPath(redirectParam) ? redirectParam : null;

  // Persist redirect param to localStorage on mount
  useEffect(() => {
    console.log("[auth-redirect] login query redirect:", redirectParam);
    saveRedirectPath(safeRedirectParam);
    console.log("[auth-redirect] localStorage post_auth_redirect:", peekRedirectPath());
  }, [redirectParam, safeRedirectParam]);

  // Fetch logo
  useEffect(() => {
    supabase.from('site_settings').select('logo_url').limit(1).maybeSingle().then(({ data }) => {
      if (data?.logo_url) setLogoUrl(data.logo_url);
    });
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const finalRedirect = resolvePostAuthRedirect(safeRedirectParam, "/profile");

      console.log("[auth-redirect] final destination after auth:", finalRedirect);
      navigate(finalRedirect, { replace: true });
      clearRedirectPath();
    }
  }, [isAuthenticated, authLoading, navigate, safeRedirectParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if email is verified for learners
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setIsLoading(false);
        navigate("/verify-email", { state: { email, redirectTo: safeRedirectParam } });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      // Don't reset isLoading here - let AuthContext handle the redirect
      // The useEffect will trigger navigation once activeRole is set
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        // Surface rate-limit errors so the user knows to wait
        if (error.status === 429 || error.message?.includes("security purposes")) {
          toast({
            title: "Please wait",
            description: "For security purposes, please wait a moment before requesting another reset email.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      setResetEmailSent(true);
      toast({
        title: "Reset email sent!",
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      // Hide "user not found" to prevent email enumeration,
      // but surface genuine failures so users know to retry.
      const msg = error?.message?.toLowerCase() || "";
      const isEnumerationSafe =
        msg.includes("not found") ||
        msg.includes("no user") ||
        msg.includes("invalid") ||
        msg.includes("unable to validate");

      if (isEnumerationSafe) {
        setResetEmailSent(true);
      } else {
        toast({
          title: "Something went wrong",
          description: "Could not send the reset email. Please try again in a moment.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Persist redirect before leaving the page
      saveRedirectPath(safeRedirectParam);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login${safeRedirectParam ? `?redirect=${encodeURIComponent(safeRedirectParam)}` : ''}`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google.",
        variant: "destructive",
      });
    }
  };

  const handleSocialLoginComingSoon = (provider: string) => {
    toast({
      title: `${provider} login coming soon`,
      description: `${provider} authentication will be available soon.`,
    });
  };

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
            <img src="/placeholder.svg" alt="UnlockMemory" className="h-12 w-auto hidden" id="login-logo-desktop" />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-glow" id="login-fallback-desktop">
              <span className="text-3xl font-black text-primary-foreground">U</span>
            </div>
            <span className="text-3xl tracking-[-0.02em] text-foreground"><span className="font-medium">Unlock</span><span className="font-bold">Memory</span></span>
          </Link>

          <div className="relative w-80 h-96 mb-12">
            <div className="absolute -left-4 top-6 w-full h-full bg-muted/50 rounded-3xl border border-border rotate-[-8deg]" />
            <div className="absolute -right-4 top-3 w-full h-full bg-muted/30 rounded-3xl border border-border rotate-[5deg]" />
            
            <div className="relative w-full h-full bg-card rounded-3xl border-2 border-primary/20 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              <div className="relative p-8 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-primary/60" />
                  <div className="w-3 h-3 rounded-full bg-accent/60" />
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="h-4 bg-foreground/10 rounded w-3/4" />
                  <div className="h-4 bg-foreground/10 rounded w-full" />
                  <div className="h-4 bg-foreground/10 rounded w-5/6" />
                  <div className="h-4 bg-foreground/10 rounded w-2/3" />
                </div>
                
                <div className="absolute bottom-8 right-8 text-7xl opacity-20">🔓</div>
                
                <div className="mt-auto">
                  <p className="text-sm text-muted-foreground">Welcome back to learning</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-foreground mb-3">Continue Your Journey</h2>
            <p className="text-muted-foreground">
              Pick up where you left off and keep building your skills.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">U</span>
            </div>
            <span className="text-2xl tracking-[-0.02em] text-foreground"><span className="font-medium">Unlock</span><span className="font-bold">Memory</span></span>
          </Link>

          {roleChangedReason && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your role has been changed by an administrator. Please log in again.
              </AlertDescription>
            </Alert>
          )}

          {unauthorizedReason && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please log in to access that page.
              </AlertDescription>
            </Alert>
          )}

          {forgotPasswordMode ? (
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-black text-foreground mb-2">Reset Password</h1>
                <p className="text-muted-foreground">
                  {resetEmailSent 
                    ? "Check your email for reset instructions."
                    : "Enter your email and we'll send you a reset link."}
                </p>
              </div>

              {!resetEmailSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="h-12 pl-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              ) : (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center space-y-3">
                  <div className="text-4xl mb-2">📧</div>
                  <p className="text-foreground font-medium">Email sent!</p>
                  <p className="text-sm text-muted-foreground">Check your inbox and spam folder.</p>
                  <button
                    type="button"
                    onClick={() => setResetEmailSent(false)}
                    className="text-sm text-primary hover:text-primary/80 underline underline-offset-2 transition-colors mt-2"
                  >
                    Didn't receive it? Send again
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setForgotPasswordMode(false);
                  setResetEmailSent(false);
                }}
                className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Back to login
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-black text-foreground mb-2">Sign In</h1>
                <p className="text-muted-foreground">
                  Welcome back! Enter your credentials to continue.
                </p>
              </div>

              {/* Google Login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-3 w-full h-14 rounded-full border border-border bg-card hover:bg-muted/50 hover:shadow-md transition-all duration-300"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-base font-medium text-foreground">Continue with Google</span>
              </button>


              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      className="h-12 pl-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordMode(true)}
                    className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to={`/signup${safeRedirectParam ? `?redirect=${encodeURIComponent(safeRedirectParam)}` : ''}`} className="text-primary hover:text-primary/80 font-semibold">
                  Create Learner Account
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
