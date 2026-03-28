import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, UserPlus, Link as LinkIcon } from "lucide-react";
import UMLoader from "@/components/UMLoader";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Platform Manager" },
  { value: "super_moderator", label: "Career Manager" },
  { value: "senior_moderator", label: "Course Manager" },
  { value: "moderator", label: "Content Moderator" },
];

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
}

const InviteUserDialog = ({ open, onOpenChange, onInviteSent }: InviteUserDialogProps) => {
  const { toast } = useToast();
  const { userId } = useAuth();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("moderator");
  const [isCreating, setIsCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateToken = () => {
    return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  };

  const handleCreate = async () => {
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    setIsCreating(true);

    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase.from("invitations").insert({
        email: email.trim().toLowerCase(),
        role,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: userId,
      });

      if (error) throw error;

      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);

      toast({ title: "Invitation created!", description: "Copy the link and share it." });
      onInviteSent?.();
    } catch (err: any) {
      toast({
        title: "Failed to create invitation",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setEmail("");
      setRole("moderator");
      setInviteLink(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Create an invitation link to assign a role. The link expires in 7 days.
          </DialogDescription>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <UMLoader size={16} />
                    <span className="ml-2">Creating...</span>
                  </>
                ) : (
                  "Create Invitation"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <LinkIcon className="h-4 w-4 text-primary" />
                Invitation Link
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="text-xs font-mono bg-background"
                />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with <strong>{email}</strong> to grant them <strong>{ROLE_OPTIONS.find(opt => opt.value === role)?.label || role.replace("_", " ")}</strong> access.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Done
              </Button>
              <Button
                onClick={() => {
                  setInviteLink(null);
                  setEmail("");
                  setCopied(false);
                }}
              >
                Invite Another
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
