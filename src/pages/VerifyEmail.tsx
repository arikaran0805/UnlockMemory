/**
 * Email Verification Page
 * 
 * Routes:
 * - /verify-email - Waiting screen after signup
 * - /verify-email/confirm - Email link handler (auto-login for learners)
 */

import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import VerificationSuccess from "@/components/verify-email/VerificationSuccess";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const emailFromState = (location.state as any)?.email;
  const redirectTo = (location.state as any)?.redirectTo;
  const isConfirmPage = location.pathname === '/verify-email/confirm';

  // Handle email confirmation link
  useEffect(() => {
    if (!isConfirmPage) return;

    const handleConfirmation = async () => {
      setIsVerifying(true);

      try {
        // Check for token in URL (Supabase email link format)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = searchParams.get("code");
        const token = searchParams.get("token") || hashParams.get("access_token");
        const type = hashParams.get("type") || searchParams.get("type");

        // Handle PKCE code exchange
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session?.user) {
          // Try to verify with token if no session
          if (token && type === "signup") {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: "signup",
            });
            if (verifyError) throw verifyError;
          } else {
            throw new Error("No valid session found. Please try signing up again.");
          }
        }

        // Check if email is verified
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user?.email_confirmed_at) {
          throw new Error("Email verification failed. Please try again.");
        }

        // Assign learner role if not already assigned
        const { data: existingRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (!existingRoles || existingRoles.length === 0) {
          await supabase
            .from("user_roles")
            .insert({ user_id: user.id, role: "user" });
        }

        // Sign out - user must log in manually after verification
        await supabase.auth.signOut();

        setVerificationStatus('success');
      } catch (error: any) {
        console.error("Verification error:", error);
        setVerificationStatus('error');
        setErrorMessage(error.message || "Verification failed. Please try again.");
      } finally {
        setIsVerifying(false);
      }
    };

    handleConfirmation();
  }, [isConfirmPage, searchParams, navigate, toast]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!emailFromState) {
      toast({
        title: "Error",
        description: "No email address found. Please sign up again.",
        variant: "destructive",
      });
      navigate("/signup");
      return;
    }

    if (resendCooldown > 0) return;

    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailFromState,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email/confirm`,
        },
      });

      if (error) throw error;

      setResendCooldown(30);

      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Confirmation page - show verification status
  if (isConfirmPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center">
          <Link to="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">U</span>
            </div>
            <span className="text-2xl font-bold text-foreground">UnlockMemory</span>
          </Link>

          {isVerifying && (
            <div className="space-y-6">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Verifying your email...</h1>
                <p className="text-muted-foreground">Please wait while we confirm your account.</p>
              </div>
            </div>
          )}

          {verificationStatus === 'success' && <VerificationSuccess redirectTo={redirectTo} />}

          {verificationStatus === 'error' && (
            <div className="space-y-6">
              <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Verification Failed</h1>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate("/signup")}
                  variant="outline"
                >
                  Try Signing Up Again
                </Button>
                <Link to="/login" className="text-primary hover:underline text-sm">
                  Already verified? Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Waiting page - shown after signup
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <span className="text-2xl font-bold text-primary-foreground">U</span>
          </div>
          <span className="text-2xl font-bold text-foreground">UnlockMemory</span>
        </Link>

        <div className="space-y-6">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-muted-foreground">
              We've sent a verification link to
              {emailFromState && (
                <span className="block font-medium text-foreground mt-1">{emailFromState}</span>
              )}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
            <p>Click the link in your email to verify your account and start learning.</p>
            <p className="mt-2">Don't see it? Check your spam folder.</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              variant="outline"
              disabled={isResending || !emailFromState || resendCooldown > 0}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                "Resend verification email"
              )}
            </Button>

            <Link to={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`} className="block text-primary hover:underline text-sm">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;