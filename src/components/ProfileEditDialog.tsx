/**
 * ProfileEditDialog — centered modal showing profile info with editable name + email
 */
import { useState, useEffect } from "react";
import { User, Mail, Shield, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  onProfileUpdated: (updated: { full_name: string | null; avatar_url: string | null }) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin:            "Platform Manager",
  super_moderator:  "Career Manager",
  senior_moderator: "Course Manager",
  moderator:        "Content Moderator",
  user:             "Learner",
};

const ROLE_COLORS: Record<string, string> = {
  admin:            "from-emerald-600 to-emerald-800",
  super_moderator:  "from-emerald-500 to-emerald-700",
  senior_moderator: "from-emerald-400 to-emerald-600",
  moderator:        "from-emerald-300 to-emerald-500",
};

const ProfileEditDialog = ({ open, onOpenChange, userProfile, onProfileUpdated }: ProfileEditDialogProps) => {
  const { user, activeRole } = useAuth();
  const { toast } = useToast();

  const [name,  setName]  = useState(userProfile?.full_name  || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

  // Sync when dialog opens or profile changes
  useEffect(() => {
    setName(userProfile?.full_name || "");
    setEmail(user?.email || "");
  }, [open, userProfile, user]);

  const displayName = userProfile?.full_name || user?.email?.split("@")[0] || "Platform Manager";
  const initials    = displayName.charAt(0).toUpperCase();
  const roleLabel   = ROLE_LABELS[activeRole ?? ""] ?? "Platform Manager";

  const isDirty =
    name.trim()  !== (userProfile?.full_name  || "") ||
    email.trim() !== (user?.email             || "");

  const handleSave = async () => {
    if (!user || !isDirty) return;
    setSaving(true);
    try {
      // Update full_name in profiles table
      if (name.trim() !== (userProfile?.full_name || "")) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: name.trim() })
          .eq("id", user.id);
        if (error) throw error;
        onProfileUpdated({ ...userProfile, full_name: name.trim() });
      }

      // Update email via auth if changed
      if (email.trim() !== user.email) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        if (error) throw error;
      }

      toast({ title: "Profile updated" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] border border-border/40 shadow-2xl backdrop-blur-xl bg-background/95"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        {/* ── Avatar + name hero ── */}
        <div className="flex flex-col items-center gap-4 px-8 pt-10 pb-6 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          
          <div className="relative">
            {userProfile?.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt={displayName}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-lg"
              />
            ) : (
              <div
                className={cn(
                  "h-24 w-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ring-4 ring-background shadow-lg bg-gradient-to-br",
                  ROLE_COLORS[activeRole ?? ""] || "from-primary to-primary/80"
                )}
              >
                {initials}
              </div>
            )}
            {/* Online indicator dot */}
            <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-background shadow-sm" />
          </div>

          {/* Role badge */}
          <span className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 backdrop-blur-md">
            <Shield className="h-3.5 w-3.5" />
            {roleLabel}
          </span>
        </div>

        {/* ── Editable fields ── */}
        <div className="px-8 pb-4 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider ml-1">
              <User className="h-3.5 w-3.5" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              className={cn(
                "w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all",
                "bg-muted/30 border border-border/50",
                "focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10",
                "placeholder:text-muted-foreground/60 text-foreground"
              )}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider ml-1">
              <Mail className="h-3.5 w-3.5" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={cn(
                "w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all",
                "bg-muted/30 border border-border/50",
                "focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10",
                "placeholder:text-muted-foreground/60 text-foreground"
              )}
            />
            {email.trim() !== (user?.email || "") && (
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-500 ml-1 mt-1.5">
                A confirmation link will be sent to your new email.
              </p>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 px-8 pb-8 pt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-semibold transition-all border border-border/60 hover:bg-secondary hover:border-border text-muted-foreground hover:text-secondary-foreground active:scale-[0.98]"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-semibold transition-all shadow-sm",
              isDirty && !saving
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Check className="h-4 w-4" />
            }
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;
