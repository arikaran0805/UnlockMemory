/**
 * Accept Invite Page
 * 
 * Route: /invite/:token
 * Handles invite-based role assignment for admins, moderators, etc.
 * 
 * - If user doesn't exist: Create account with role
 * - If user exists: Add role to existing account
 */

import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, ArrowRight, Eye, EyeOff, CheckCircle, XCircle, Loader2, Shield } from "lucide-react";
import { useAuth, getRoleDashboardPath } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  expires_at: string;
  accepted_at: string | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Platform Manager",
  super_moderator: "Career Manager",
  senior_moderator: "Course Manager",
  moderator: "Content Moderator",
  user: "Learner",
};

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user, refreshAuthState } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userExists, setUserExists] = useState(false);

  // Form fields (for new users only)
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Load invitation
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError("Invalid invitation link.");
        setIsLoading(false);
        return;
      }

      try {
        const { data: invite, error: fetchError } = await supabase
          .from("invitations")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!invite) {
          setError("This invitation link is invalid or has been revoked.");
          setIsLoading(false);
          return;
        }

        // Check if already accepted
        if (invite.accepted_at) {
          setError("This invitation has already been used.");
          setIsLoading(false);
          return;
        }

        // Check if expired
        if (new Date(invite.expires_at) < new Date()) {
          setError("This invitation has expired. Please request a new one.");
          setIsLoading(false);
          return;
        }

        setInvitation(invite);

        // Check if user already exists
        // We do this by checking if there's a profile with this email
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("email", invite.email)
          .maybeSingle();

        setUserExists(!!existingProfile);

        // If current user is logged in and matches the invite email
        if (isAuthenticated && user?.email === invite.email) {
          setUserExists(true);
        }
      } catch (err: any) {
        console.error("Error loading invitation:", err);
        setError("Failed to load invitation. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvitation();
  }, [token, isAuthenticated, user]);

  const handleAcceptForExistingUser = async () => {
    if (!invitation) return;

    setIsSubmitting(true);

    try {
      // If not logged in, redirect to login with return URL
      if (!isAuthenticated) {
        navigate(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }

      // Verify current user email matches invitation
      if (user?.email !== invitation.email) {
        toast({
          title: "Email mismatch",
          description: `This invitation is for ${invitation.email}. Please sign in with that account.`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Add role to user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: invitation.role });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError;
      }

      // Mark invitation as accepted
      await supabase
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      // Update active role in profile
      await supabase
        .from("profiles")
        .update({ active_role: invitation.role })
        .eq("id", user.id);

      // Refresh auth state
      await refreshAuthState();

      toast({
        title: "Role activated!",
        description: `You now have ${ROLE_LABELS[invitation.role]} access.`,
      });

      // Redirect to appropriate dashboard
      const dashboardPath = getRoleDashboardPath(invitation.role);
      navigate(dashboardPath, { replace: true });
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptForNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

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

    setIsSubmitting(true);

    try {
      // Create account (email auto-verified for invites)
      const { data, error: signupError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signupError) throw signupError;

      if (!data.user) {
        throw new Error("Failed to create account.");
      }

      // Add invited role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: invitation.role });

      if (roleError) throw roleError;

      // Mark invitation as accepted
      await supabase
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      // Update active role in profile
      await supabase
        .from("profiles")
        .update({ active_role: invitation.role })
        .eq("id", data.user.id);

      toast({
        title: "Account created!",
        description: `Welcome! You now have ${ROLE_LABELS[invitation.role]} access.`,
      });

      // Redirect to appropriate dashboard
      const dashboardPath = getRoleDashboardPath(invitation.role);
      navigate(dashboardPath, { replace: true });
    } catch (err: any) {
      console.error("Error creating account:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create account.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}>
            <Button variant="outline">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success - existing user
  if (userExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">U</span>
            </div>
            <span className="text-2xl font-bold text-foreground">UnlockMemory</span>
          </Link>

          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-10 w-10 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Role Invitation</h1>
              <p className="text-muted-foreground">
                You've been invited to join as a
              </p>
              <p className="text-lg font-semibold text-primary mt-2">
                {ROLE_LABELS[invitation!.role]}
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
              <p>
                This role will be added to your existing account
                {invitation?.email && (
                  <span className="block font-medium text-foreground mt-1">{invitation.email}</span>
                )}
              </p>
            </div>

            <Button
              onClick={handleAcceptForExistingUser}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  Accept & Activate Role
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {!isAuthenticated && (
              <p className="text-sm text-muted-foreground">
                You'll be asked to sign in first.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // New user signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <span className="text-2xl font-bold text-primary-foreground">U</span>
          </div>
          <span className="text-2xl font-bold text-foreground">UnlockMemory</span>
        </Link>

        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Join as {ROLE_LABELS[invitation!.role]}</h1>
            <p className="text-muted-foreground">
              Create your account to accept this invitation
            </p>
            <p className="text-sm text-foreground mt-2">{invitation?.email}</p>
          </div>

          <form onSubmit={handleAcceptForNewUser} className="space-y-4">
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
                  type="password"
                  placeholder="••••••••"
                  className="h-12 pl-12 rounded-xl border-border focus:border-primary focus:ring-primary"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account & Accept
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By accepting, you agree to our{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;