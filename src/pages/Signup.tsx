/**
 * Signup Page - Learner Registration Only
 * 
 * Route: /signup
 * Only learners can self-signup. Other roles are invite-only.
 * Requires email verification before login.
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Github, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmailValidation } from "@/hooks/useEmailValidation";

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const Signup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isValid: emailValid, error: emailError, suggestion: emailSuggestion } = useEmailValidation(email);

  // Check if currently rate limited
  const isRateLimited = rateLimitedUntil !== null && Date.now() < rateLimitedUntil;

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/profile", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limit check
    if (isRateLimited) {
      const secsLeft = Math.ceil((rateLimitedUntil! - Date.now()) / 1000);
      toast({
        title: "Too many attempts",
        description: `Please wait ${secsLeft} seconds before trying again.`,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (!fullName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }

    // Track signup attempts for rate limiting
    const now = Date.now();
    const attemptsRaw = sessionStorage.getItem("signup_attempts");
    let attempts: number[] = attemptsRaw ? JSON.parse(attemptsRaw) : [];
    attempts = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    attempts.push(now);
    sessionStorage.setItem("signup_attempts", JSON.stringify(attempts));

    if (attempts.length > RATE_LIMIT_MAX) {
      const lockUntil = now + 60 * 1000; // 1 minute cooldown
      setRateLimitedUntil(lockUntil);
      toast({
        title: "Too many attempts",
        description: "You've tried too many times. Please wait 1 minute.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create account - email verification required
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email/confirm`,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      // Check if user already exists
      if (data.user?.identities?.length === 0) {
        toast({
          title: "Account exists",
          description: "An account with this email already exists. Please sign in.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Sign out immediately - no session until email verified
      await supabase.auth.signOut();

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      // Redirect to verification waiting page
      navigate("/verify-email", { state: { email } });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign up with Google.",
        variant: "destructive",
      });
    }
  };

  const handleSocialLoginComingSoon = (provider: string) => {
    toast({
      title: `${provider} signup coming soon`,
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <span className="text-3xl font-black text-primary-foreground">U</span>
            </div>
            <span className="text-3xl font-black text-foreground">UnlockMemory</span>
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
                </div>
                
                <div className="absolute bottom-8 right-8 text-7xl opacity-20">🎓</div>
                
                <div className="mt-auto">
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-1/4 bg-gradient-to-r from-primary to-accent rounded-full" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">Start your learning journey</p>
                </div>
              </div>
            </div>
            
            <div className="absolute -top-4 -right-8 w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center animate-[bounce_3s_ease-in-out_infinite]">
              <span className="text-4xl">🚀</span>
            </div>
            <div className="absolute -bottom-6 -left-4 w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center animate-[bounce_4s_ease-in-out_infinite_0.5s]">
              <span className="text-3xl">✨</span>
            </div>
          </div>

          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-foreground mb-3">Join Our Learning Community</h2>
            <p className="text-muted-foreground">
              Create your free learner account and start mastering new skills today.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">U</span>
            </div>
            <span className="text-2xl font-bold text-foreground">UnlockMemory</span>
          </Link>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-black text-foreground mb-2">Create Learner Account</h1>
              <p className="text-muted-foreground">
                Sign up to access courses, track progress, and earn certificates.
              </p>
            </div>

            {/* Google Signup */}
            <button
              type="button"
              onClick={handleGoogleSignup}
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
                <span className="bg-background px-4 text-muted-foreground">or sign up with email</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="John Doe"
                    className="h-12 pl-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    className={`h-12 pl-12 ${emailValid ? 'pr-12' : ''} rounded-xl border-border focus:border-primary focus:ring-primary ${emailValid === false && email.length > 2 ? 'border-destructive focus:border-destructive' : ''} ${emailValid === true ? 'border-emerald-500 focus:border-emerald-500' : ''}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  {emailValid === true && (
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  )}
                </div>
                {emailError && email.length > 2 && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
                {emailSuggestion && (
                  <button
                    type="button"
                    onClick={() => setEmail(emailSuggestion)}
                    className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                  >
                    Did you mean <span className="font-semibold">{emailSuggestion}</span>?
                  </button>
                )}
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-12 pl-12 pr-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Learner Account"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 font-semibold">
                Sign In
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;