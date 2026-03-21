import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, HelpCircle, Loader2, MessageCircle, User, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ResolvedOwner } from "@/hooks/useDoubtSystem";

interface MentorPreviewContentProps {
  mentor: ResolvedOwner;
  context: { source_type: string; source_title: string };
  isConnecting: boolean;
  onStartConversation: () => void;
  onConnectOther?: () => void;
}

const sourceIcons: Record<string, typeof BookOpen> = {
  lesson: BookOpen,
  post: FileText,
  course: BookOpen,
  quiz: HelpCircle,
  practice: HelpCircle,
  bookmark: BookOpen,
};

const roleLabels: Record<string, string> = {
  moderator: "Moderator",
  senior_moderator: "Senior Moderator",
  super_moderator: "Super Moderator",
};

interface MentorStats {
  courseNames: string[];
  publishedPosts: number;
  doubtsResolved: number;
}

export function MentorPreviewContent({ mentor, context, isConnecting, onStartConversation, onConnectOther }: MentorPreviewContentProps) {
  const Icon = sourceIcons[context.source_type] || HelpCircle;
  const [stats, setStats] = useState<MentorStats>({ courseNames: [], publishedPosts: 0, doubtsResolved: 0 });

  useEffect(() => {
    if (!mentor.user_id) return;

    const fetchStats = async () => {
      const [coursesRes, postsRes, doubtsRes] = await Promise.all([
        // Courses assigned to or authored by this mentor
        supabase
          .from("courses")
          .select("name")
          .or(`assigned_to.eq.${mentor.user_id},author_id.eq.${mentor.user_id},default_senior_moderator.eq.${mentor.user_id}`)
          .limit(5),
        // Published posts by this mentor
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", mentor.user_id)
          .eq("status", "published"),
        // Doubts resolved by this mentor
        supabase
          .from("doubt_threads")
          .select("id", { count: "exact", head: true })
          .eq("assigned_user_id", mentor.user_id)
          .in("status", ["resolved", "closed"]),
      ]);

      setStats({
        courseNames: (coursesRes.data || []).map((c) => c.name),
        publishedPosts: postsRes.count || 0,
        doubtsResolved: doubtsRes.count || 0,
      });
    };

    fetchStats();
  }, [mentor.user_id]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Source Context */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1.5">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground capitalize">{context.source_type}</p>
              <p className="text-sm font-medium text-foreground line-clamp-1">{context.source_title}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 bg-background/50">
            Context will be shared with mentor
          </Badge>
        </div>

        {/* Mentor Profile */}
        <div className="flex flex-col items-center text-center space-y-2.5 py-2">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            {mentor.avatar_url ? (
              <AvatarImage src={mentor.avatar_url} alt={mentor.user_name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
              {mentor.user_name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">{mentor.user_name}</h3>
            <Badge variant="secondary" className="text-[10px]">
              {roleLabels[mentor.role] || mentor.role}
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/30 bg-muted/15 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Posts</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{stats.publishedPosts}</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-muted/15 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Resolved</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{stats.doubtsResolved}</p>
          </div>
        </div>

        {/* Courses */}
        {stats.courseNames.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Courses</p>
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

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          This mentor is assigned to help you with this content.
        </p>
      </div>

      {/* Footer CTAs */}
      <div className="px-4 py-3 border-t border-border/30 bg-muted/10 space-y-2">
        <Button
          onClick={onStartConversation}
          disabled={isConnecting}
          className="w-full"
          size="sm"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <MessageCircle className="h-3.5 w-3.5 mr-2" />
              Start Asking
            </>
          )}
        </Button>
        {onConnectOther && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={onConnectOther}
          >
            <Users className="h-3.5 w-3.5 mr-2" />
            Connect with Someone Else
          </Button>
        )}
      </div>
    </div>
  );
}
