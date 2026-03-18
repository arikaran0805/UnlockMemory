import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Headphones, GraduationCap } from "lucide-react";
import { useState } from "react";

interface NewConnectionContentProps {
  onConnect: (type: string, name: string) => void;
}

interface NewConnectionModalProps extends NewConnectionContentProps {
  open: boolean;
  onClose: () => void;
}

const CONNECTION_TYPES = [
  {
    type: "mentor",
    label: "Connect to Mentor",
    description: "Get paired with an assigned mentor",
    icon: GraduationCap,
  },
  {
    type: "support",
    label: "Support Team",
    description: "Reach out to platform support",
    icon: Headphones,
  },
  {
    type: "team",
    label: "Join a Team",
    description: "Connect using an invite code",
    icon: Users,
  },
  {
    type: "instructor",
    label: "Lesson Instructor",
    description: "Connect to the course instructor",
    icon: UserPlus,
  },
];

export function NewConnectionContent({ onConnect }: NewConnectionContentProps) {
  const [inviteCode, setInviteCode] = useState("");

  return (
    <div className="px-4 pb-4 pt-2 space-y-2">
      {CONNECTION_TYPES.map((ct) => {
        const Icon = ct.icon;
        return (
          <button
            key={ct.type}
            onClick={() => onConnect(ct.type, ct.label)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-muted/40 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{ct.label}</p>
              <p className="text-xs text-muted-foreground">{ct.description}</p>
            </div>
          </button>
        );
      })}

      <div className="pt-3 mt-1 border-t border-border/20">
        <p className="text-xs text-muted-foreground mb-2">Have an invite code?</p>
        <div className="flex gap-2">
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter code"
            className="h-9 rounded-xl text-sm flex-1 border-border/30"
          />
          <Button
            size="sm"
            disabled={!inviteCode.trim()}
            className="h-9 rounded-xl text-sm px-4"
            onClick={() => {
              onConnect("team", `Team (${inviteCode.trim()})`);
              setInviteCode("");
            }}
          >
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NewConnectionModal({ open, onClose, onConnect }: NewConnectionModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[380px] rounded-3xl p-0 gap-0 border-border/30 shadow-xl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold text-foreground">
            New Connection
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Choose how you'd like to connect
          </p>
        </DialogHeader>
        <NewConnectionContent onConnect={onConnect} />
      </DialogContent>
    </Dialog>
  );
}
