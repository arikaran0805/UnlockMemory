import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Headphones, GraduationCap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NewConnectionContentProps {
  onConnect: (type: string, name: string) => void;
  courseId?: string;
  userId?: string;
  onDirectConnect?: (targetUserId: string, displayName: string, roleLabel: string, avatarUrl: string | null) => void;
}

interface NewConnectionModalProps extends NewConnectionContentProps {
  open: boolean;
  onClose: () => void;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_label: string;
}

export function NewConnectionContent({ onConnect, courseId, userId, onDirectConnect }: NewConnectionContentProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    fetchTeamMembers();
  }, [courseId]);

  const fetchTeamMembers = async () => {
    if (!courseId) return;
    setIsLoadingMembers(true);
    try {
      // Get the career(s) this course belongs to
      const { data: careerCourses } = await supabase
        .from("career_courses")
        .select("career_id")
        .eq("course_id", courseId)
        .is("deleted_at", null);

      const careerIds = (careerCourses || []).map((cc) => cc.career_id);

      const userIds = new Set<string>();

      // Get users assigned to the career (super moderators)
      if (careerIds.length > 0) {
        const { data: careerAssigns } = await supabase
          .from("career_assignments")
          .select("user_id")
          .in("career_id", careerIds);
        (careerAssigns || []).forEach((a) => userIds.add(a.user_id));
      }

      // Get users directly assigned to this course
      const { data: courseAssigns } = await supabase
        .from("course_assignments")
        .select("user_id")
        .eq("course_id", courseId);
      (courseAssigns || []).forEach((a) => userIds.add(a.user_id));

      // Get course author and assigned_to
      const { data: course } = await supabase
        .from("courses")
        .select("author_id, assigned_to, default_senior_moderator")
        .eq("id", courseId)
        .single();

      if (course?.author_id) userIds.add(course.author_id);
      if (course?.assigned_to) userIds.add(course.assigned_to);
      if (course?.default_senior_moderator) userIds.add(course.default_senior_moderator);

      // Remove current user
      if (userId) userIds.delete(userId);

      if (userIds.size === 0) {
        setTeamMembers([]);
        setIsLoadingMembers(false);
        return;
      }

      const ids = Array.from(userIds);

      // Fetch profiles and roles in parallel
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];

      const roleMap = new Map<string, string[]>();
      roles.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      const members: TeamMember[] = profiles
        .filter((p) => p.full_name)
        .map((p) => {
          const userRoles = roleMap.get(p.id) || [];
          const roleLabel = userRoles.includes("super_moderator")
            ? "Super Moderator"
            : userRoles.includes("senior_moderator")
              ? "Senior Moderator"
              : userRoles.includes("moderator")
                ? "Moderator"
                : "Instructor";
          return {
            id: p.id,
            full_name: p.full_name || "Team Member",
            avatar_url: p.avatar_url,
            role_label: roleLabel,
          };
        });

      setTeamMembers(members);
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleMemberClick = async (member: TeamMember) => {
    if (!userId || !onDirectConnect) return;
    setConnectingId(member.id);
    try {
      // Check if connection already exists
      const { data: existing } = await supabase
        .from("team_connections")
        .select("id")
        .eq("learner_id", userId)
        .eq("connected_user_id", member.id)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        onDirectConnect(member.id, member.full_name, member.role_label, member.avatar_url);
        return;
      }

      // Create new connection
      await supabase.from("team_connections").insert({
        learner_id: userId,
        connected_user_id: member.id,
        connection_type: "instructor",
        display_name: member.full_name,
        avatar_url: member.avatar_url,
        role_label: member.role_label,
        status: "active",
      });

      onDirectConnect(member.id, member.full_name, member.role_label, member.avatar_url);
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setConnectingId(null);
    }
  };

  // If we have team members from the career/course, show them
  if (courseId && (isLoadingMembers || teamMembers.length > 0)) {
    return (
      <div className="px-4 pb-4 pt-2">
        <p className="text-xs text-muted-foreground mb-3">Team members assigned to this course</p>
        {isLoadingMembers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-1">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member)}
                  disabled={connectingId === member.id}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-muted/40 transition-all duration-200 group disabled:opacity-60"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {member.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.role_label}</p>
                  </div>
                  {connectingId === member.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  // Fallback: generic connection types
  const CONNECTION_TYPES = [
    { type: "mentor", label: "Connect to Mentor", description: "Get paired with an assigned mentor", icon: GraduationCap },
    { type: "support", label: "Support Team", description: "Reach out to platform support", icon: Headphones },
    { type: "team", label: "Join a Team", description: "Connect using an invite code", icon: Users },
    { type: "instructor", label: "Lesson Instructor", description: "Connect to the course instructor", icon: UserPlus },
  ];

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
          <InviteCodeInput onConnect={onConnect} />
        </div>
      </div>
    </div>
  );
}

function InviteCodeInput({ onConnect }: { onConnect: (type: string, name: string) => void }) {
  const [inviteCode, setInviteCode] = useState("");
  return (
    <>
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
    </>
  );
}

export function NewConnectionModal({ open, onClose, onConnect, courseId, userId, onDirectConnect }: NewConnectionModalProps) {
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
        <NewConnectionContent onConnect={onConnect} courseId={courseId} userId={userId} onDirectConnect={onDirectConnect} />
      </DialogContent>
    </Dialog>
  );
}
