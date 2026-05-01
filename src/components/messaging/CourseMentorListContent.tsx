/**
 * CourseMentorListContent
 *
 * Shown when the learner clicks "Connect with Someone Else" or "Switch Mentor".
 * - Always shows a search bar at the top
 * - Pre-loads mentors assigned to the course AND career (via career_assignments)
 * - When searching, also searches all platform moderators/managers
 */
import { useEffect, useState, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, MessageCircle, Search, X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConnectionPresence } from "@/hooks/useConnectionPresence";
import { cn } from "@/lib/utils";

interface CourseMentor {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role_label: string;
}

const roleLabels: Record<string, string> = {
  senior_moderator: "Course Manager",
  moderator: "Content Moderator",
  super_moderator: "Career Manager",
};

const rolePriority: Record<string, number> = {
  super_moderator: 3,
  senior_moderator: 2,
  moderator: 1,
};

// ─── single mentor row ────────────────────────────────────────────────────────
function MentorRow({
  mentor,
  isConnecting,
  onConnect,
}: {
  mentor: CourseMentor;
  isConnecting: boolean;
  onConnect: (m: CourseMentor) => void;
}) {
  const presence = useConnectionPresence(mentor.user_id);

  return (
    <button
      onClick={() => !isConnecting && onConnect(mentor)}
      disabled={isConnecting}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left",
        "border-b border-border/20 last:border-b-0 transition-colors",
        isConnecting ? "bg-primary/5 cursor-default" : "hover:bg-muted/50 active:bg-muted/70",
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar className={cn("h-9 w-9 border border-border/30", isConnecting && "opacity-60")}>
          <AvatarImage src={mentor.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {mentor.full_name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        {presence.is_online && !isConnecting && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-semibold truncate leading-tight", isConnecting ? "text-primary" : "text-foreground")}>
          {mentor.full_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isConnecting ? (
            <span className="text-[10.5px] text-primary font-medium">Connecting…</span>
          ) : (
            <>
              <span className="text-[10.5px] text-muted-foreground/70 truncate">{mentor.role_label}</span>
              {presence.is_online && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[10.5px] text-primary font-medium">Online</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {isConnecting ? (
        <Loader2 className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-spin" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
      )}
    </button>
  );
}

// ─── current mentor row (clickable → returns to active chat) ─────────────────
function CurrentMentorRow({ mentor, onClick }: { mentor: CourseMentor; onClick: () => void }) {
  const presence = useConnectionPresence(mentor.user_id);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 active:bg-muted/70 transition-colors"
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-9 w-9 border border-border/30">
          <AvatarImage src={mentor.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {mentor.full_name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
          presence.is_online ? "bg-primary" : "bg-muted-foreground/40"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
          {mentor.full_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10.5px] text-muted-foreground/70 truncate">{mentor.role_label}</span>
          {presence.is_online && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-[10.5px] text-primary font-medium">Online</span>
            </>
          )}
        </div>
      </div>
      {/* Active badge */}
      <span className="flex-shrink-0 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
        Active
      </span>
    </button>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
async function resolveProfiles(ids: string[]): Promise<CourseMentor[]> {
  if (!ids.length) return [];
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
    supabase.from("user_roles").select("user_id, role").in("user_id", ids),
  ]);

  const roleMap = new Map<string, string>();
  rolesRes.data?.forEach((r) => {
    const existing = roleMap.get(r.user_id);
    if (!existing || (rolePriority[r.role] || 0) > (rolePriority[existing] || 0)) {
      roleMap.set(r.user_id, r.role);
    }
  });

  return (profilesRes.data || []).map((p) => ({
    user_id: p.id,
    full_name: p.full_name || "Mentor",
    avatar_url: p.avatar_url || null,
    role_label: roleLabels[roleMap.get(p.id) || ""] || "Instructor",
  }));
}

// ─── main component ───────────────────────────────────────────────────────────
interface CourseMentorListContentProps {
  courseId: string | undefined;
  userId: string;
  lessonId?: string;
  /** The mentor the user is currently chatting with — pinned below the search bar */
  currentMentor?: CourseMentor;
  /** Called when the user clicks the current mentor row to return to the active chat */
  onGoToCurrentChat?: () => void;
  onConnect: (connectionId: string, lessonId?: string) => void;
  onFetchConnections: () => void;
}

export function CourseMentorListContent({
  courseId,
  userId,
  lessonId,
  currentMentor,
  onGoToCurrentChat,
  onConnect,
  onFetchConnections,
}: CourseMentorListContentProps) {
  // Mentors assigned to this course/career
  const [assignedMentors, setAssignedMentors] = useState<CourseMentor[]>([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(true);

  // Global search results
  const [searchResults, setSearchResults] = useState<CourseMentor[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ── fetch assigned mentors on mount ────────────────────────────────────────
  useEffect(() => {
    if (!courseId) { setIsLoadingAssigned(false); return; }

    const fetch = async () => {
      setIsLoadingAssigned(true);
      try {
        const userIds = new Set<string>();

        // Direct course fields
        const { data: course } = await supabase
          .from("courses")
          .select("author_id, assigned_to, default_senior_moderator")
          .eq("id", courseId)
          .single();
        if (course?.assigned_to) userIds.add(course.assigned_to);
        if (course?.default_senior_moderator) userIds.add(course.default_senior_moderator);
        if (course?.author_id) userIds.add(course.author_id);

        // Team-based moderators
        const { data: assignments } = await supabase
          .from("course_assignments")
          .select("team_id")
          .eq("course_id", courseId)
          .not("team_id", "is", null);
        if (assignments?.length) {
          const teamIds = assignments.map((a) => a.team_id).filter(Boolean) as string[];
          const { data: teams } = await supabase
            .from("teams").select("senior_moderator_user_id").in("id", teamIds);
          teams?.forEach((t) => { if (t.senior_moderator_user_id) userIds.add(t.senior_moderator_user_id); });
        }

        // Career managers (career_courses → career_assignments)
        const { data: careerCourses } = await supabase
          .from("career_courses")
          .select("career_id")
          .eq("course_id", courseId)
          .is("deleted_at", null);
        if (careerCourses?.length) {
          const careerIds = careerCourses.map((cc) => cc.career_id);
          const { data: careerAssignments } = await supabase
            .from("career_assignments").select("user_id").in("career_id", careerIds);
          careerAssignments?.forEach((ca) => { if (ca.user_id) userIds.add(ca.user_id); });
        }

        userIds.delete(userId);
        const mentors = await resolveProfiles(Array.from(userIds));
        mentors.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setAssignedMentors(mentors);
      } finally {
        setIsLoadingAssigned(false);
      }
    };

    fetch();
  }, [courseId, userId]);

  // ── global search across all moderators ────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      // Search profiles by name
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${q.trim()}%`)
        .limit(20);

      if (!profiles?.length) { setSearchResults([]); return; }

      const ids = profiles.map((p) => p.id).filter((id) => id !== userId);
      // Only show users who have a moderator role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids)
        .in("role", ["moderator", "senior_moderator", "super_moderator"]);

      const validIds = new Set(roles?.map((r) => r.user_id) || []);
      const roleMap = new Map<string, string>();
      roles?.forEach((r) => {
        const existing = roleMap.get(r.user_id);
        if (!existing || (rolePriority[r.role] || 0) > (rolePriority[existing] || 0)) {
          roleMap.set(r.user_id, r.role);
        }
      });

      const results: CourseMentor[] = profiles
        .filter((p) => validIds.has(p.id))
        .map((p) => ({
          user_id: p.id,
          full_name: p.full_name || "Mentor",
          avatar_url: p.avatar_url || null,
          role_label: roleLabels[roleMap.get(p.id) || ""] || "Instructor",
        }));

      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }, [userId]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => runSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, runSearch]);

  // ── displayed list ─────────────────────────────────────────────────────────
  const isSearchActive = search.trim().length > 0;

  // When searching, filter assigned mentors first + append extra global results
  const displayList = useMemo(() => {
    if (!isSearchActive) return assignedMentors;

    const q = search.trim().toLowerCase();
    const localMatches = assignedMentors.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.role_label.toLowerCase().includes(q)
    );
    const localIds = new Set(localMatches.map((m) => m.user_id));
    const extras = searchResults.filter((m) => !localIds.has(m.user_id));
    return [...localMatches, ...extras];
  }, [isSearchActive, search, assignedMentors, searchResults]);

  // ── connect handler ────────────────────────────────────────────────────────
  const handleConnect = async (mentor: CourseMentor) => {
    setConnectingId(mentor.user_id);
    try {
      const { data: existing } = await supabase
        .from("team_connections")
        .select("id")
        .eq("learner_id", userId)
        .eq("connected_user_id", mentor.user_id)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        onFetchConnections();
        onConnect(existing.id, lessonId);
        return;
      }

      const { data: newConn } = await supabase
        .from("team_connections")
        .insert({
          learner_id: userId,
          connected_user_id: mentor.user_id,
          connection_type: "instructor",
          display_name: mentor.full_name,
          avatar_url: mentor.avatar_url,
          role_label: mentor.role_label,
          status: "active",
        })
        .select()
        .single();

      onFetchConnections();
      if (newConn) onConnect(newConn.id, lessonId);
    } finally {
      setConnectingId(null);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Always-visible search bar ───────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2.5 border-b border-border/20 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mentors…"
            autoFocus
            className={cn(
              "w-full pl-8 pr-8 py-1.5 text-[12.5px] rounded-lg",
              "bg-muted/40 border border-border/30",
              "focus:border-primary/50 focus:bg-background",
              "text-foreground placeholder:text-muted-foreground/50",
              "outline-none transition-all duration-150"
            )}
          />
          {isSearching ? (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground/40" />
          ) : search ? (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Current mentor — pinned below search, always visible ──────────── */}
      {currentMentor && (
        <div className="flex-shrink-0 border-b border-border/20">
          <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/45">
            Currently chatting with
          </p>
          <CurrentMentorRow mentor={currentMentor} onClick={() => onGoToCurrentChat?.()} />
        </div>
      )}

      {/* ── Content area ────────────────────────────────────────────────── */}
      {isLoadingAssigned ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
        </div>
      ) : displayList.length > 0 ? (
        <>
          {/* Section label */}
          <p className="px-4 pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 flex-shrink-0">
            {isSearchActive
              ? `${displayList.length} result${displayList.length !== 1 ? "s" : ""}`
              : `${assignedMentors.length} mentor${assignedMentors.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex-1 overflow-y-auto">
            {displayList.map((mentor) => (
              <MentorRow
                key={mentor.user_id}
                mentor={mentor}
                isConnecting={connectingId === mentor.user_id}
                onConnect={handleConnect}
              />
            ))}
          </div>
        </>
      ) : isSearchActive ? (
        /* No search results */
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
            <Search className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <p className="text-[13px] font-medium text-muted-foreground">No results for "{search}"</p>
          <p className="text-[11.5px] text-muted-foreground/60 mt-1">Try a different name or role</p>
        </div>
      ) : (
        /* No assigned mentors, not searching */
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
            <User className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-[13px] font-medium text-muted-foreground">No assigned mentors</p>
          <p className="text-[11.5px] text-muted-foreground/60 mt-1 leading-relaxed">
            No mentors are assigned to this course or career.<br />
            Search above to find an available mentor.
          </p>
        </div>
      )}
    </div>
  );
}
