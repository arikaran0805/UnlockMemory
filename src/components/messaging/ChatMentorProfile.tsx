import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, MessageCircle, Users, User, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useConnectionPresence, formatLastSeen } from "@/hooks/useConnectionPresence";
import type { ConnectionWithConversation } from "@/hooks/useMessaging";

interface ChatMentorProfileProps {
  connection: ConnectionWithConversation;
  onBack: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onSwitchMentor?: () => void;
}

const roleLabels: Record<string, string> = {
  moderator: "Moderator",
  senior_moderator: "Senior Moderator",
  super_moderator: "Super Moderator",
  Moderator: "Moderator",
  "Senior Moderator": "Senior Moderator",
  Instructor: "Instructor",
};

export function ChatMentorProfile({ connection, onBack, onCollapse, onClose, onSwitchMentor }: ChatMentorProfileProps) {
  const connectedUserId = (connection as any).connected_user_id;
  const presence = useConnectionPresence(connectedUserId);
  const [stats, setStats] = useState({ lessonsCount: 0, doubtsResolved: 0, courseNames: [] as string[] });

  useEffect(() => {
    if (!connectedUserId) return;
    const fetch = async () => {
      const { data: assignmentsRes } = await supabase
        .from("course_assignments")
        .select("courses(name)")
        .eq("user_id", connectedUserId)
        .limit(5);
      setStats({
        lessonsCount: 0,
        doubtsResolved: 0,
        courseNames: (assignmentsRes || []).map((a: any) => a.courses?.name).filter(Boolean),
      });
    };
    fetch();
  }, [connectedUserId]);

  const presenceText = presence.is_online ? "Online" : formatLastSeen(presence.last_seen_at);

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-foreground flex-1">Mentor Profile</p>
        <div className="flex items-center gap-0.5">
          <button onClick={onCollapse} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Avatar + Identity */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={connection.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {connection.display_name?.charAt(0)?.toUpperCase() || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card transition-colors duration-300",
              presence.is_online ? "bg-emerald-500" : "bg-muted-foreground/40"
            )} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">{connection.display_name}</h3>
            <p className={cn("text-xs", presence.is_online ? "text-emerald-500" : "text-muted-foreground")}>
              {presenceText}
            </p>
            <Badge variant="secondary" className="text-[10px]">
              {roleLabels[connection.role_label || ""] || connection.role_label || "Mentor"}
            </Badge>
          </div>
        </div>

        {/* Courses */}
        {stats.courseNames.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Teaches</p>
            <div className="flex flex-wrap gap-1.5">
              {stats.courseNames.map((name, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 bg-background/60">
                  <BookOpen className="h-2.5 w-2.5 mr-1" />
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* About */}
        <div className="rounded-xl border border-border/30 bg-muted/10 p-3 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">About</p>
          <p className="text-xs text-foreground/80 leading-relaxed">
            This mentor is assigned to help you with your learning content. Feel free to ask any doubts.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 bg-muted/10 space-y-2">
        <Button onClick={onBack} className="w-full" size="sm">
          <MessageCircle className="h-3.5 w-3.5 mr-2" />
          Continue Chat
        </Button>
        {onSwitchMentor && (
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={onSwitchMentor}>
            <Users className="h-3.5 w-3.5 mr-2" />
            Switch Mentor
          </Button>
        )}
      </div>
    </div>
  );
}
