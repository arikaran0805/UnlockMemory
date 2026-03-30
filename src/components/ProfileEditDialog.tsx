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
  admin:            "#0F6E56",
  super_moderator:  "#1A7A62",
  senior_moderator: "#268770",
  moderator:        "#33947E",
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
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border border-[#D4DDD3] shadow-2xl bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        {/* ── Avatar + name hero ── */}
        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-5">
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-[#D4DDD3]"
            />
          ) : (
            <div
              className="h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: ROLE_COLORS[activeRole ?? ""] ?? "#0F6E56" }}
            >
              {initials}
            </div>
          )}

          {/* Role badge */}
          <span
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: "#E8F0EB", color: "#2D5A3D" }}
          >
            <Shield className="h-3 w-3" />
            {roleLabel}
          </span>
        </div>

        {/* ── Divider ── */}
        <div className="mx-5 h-px bg-[#D4DDD3]" />

        {/* ── Editable fields ── */}
        <div className="px-5 py-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#6B8F71" }}>
              <User className="h-3.5 w-3.5" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              className={cn(
                "w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors",
                "border border-[#D4DDD3] focus:border-[#4A7C59]",
                "placeholder:text-[#A8C5B0]"
              )}
              style={{ background: "#F7FAF8", color: "#1A3A2A" }}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#6B8F71" }}>
              <Mail className="h-3.5 w-3.5" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={cn(
                "w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors",
                "border border-[#D4DDD3] focus:border-[#4A7C59]",
                "placeholder:text-[#A8C5B0]"
              )}
              style={{ background: "#F7FAF8", color: "#1A3A2A" }}
            />
            {email.trim() !== (user?.email || "") && (
              <p className="text-[11px] leading-tight" style={{ color: "#6B8F71" }}>
                A confirmation link will be sent to your new email.
              </p>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors border border-[#D4DDD3] hover:bg-[#EFF3EE]"
            style={{ color: "#1A3A2A" }}
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors",
              isDirty && !saving
                ? "hover:bg-[#2D5A3D]"
                : "opacity-40 cursor-not-allowed"
            )}
            style={{ backgroundColor: "#4A7C59" }}
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
