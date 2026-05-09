/**
 * Career-Scoped Secondary Header — Premium redesign
 *
 * LEFT : Career breadcrumb (clickable career name → current course name)
 * RIGHT: Numbered course-step navigation with segmented pill control
 *
 * Height is kept at 48px (h-12) — all layout offsets in CareerBoardLayout
 * depend on this value; do NOT change without updating pt-28 / pt-12 there.
 */
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, StickyNote, UserCircle, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useQueryClient } from "@tanstack/react-query";
import { courseDetailKey, fetchCourseDetail } from "@/hooks/useCourseDetailData";

interface CareerCourse {
  id: string;
  name: string;
  slug: string;
}

interface Career {
  id: string;
  name: string;
  slug: string;
}

interface CareerScopedHeaderProps {
  currentCourse?: { id: string; name: string; slug: string };
  career: Career | null;
  careerCourses: CareerCourse[];
  isHeaderVisible?: boolean;
  announcementVisible?: boolean;
  isLoading?: boolean;
  /** When set, replaces the course nav with "Notes — {deepNotesTitle}" */
  deepNotesTitle?: string | null;
  /** When set, replaces the course nav with "Practice — {practiceTitle}" */
  practiceTitle?: string | null;
}

// ─── tiny green orbit icon ────────────────────────────────────────────────────
const OrbitIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
    <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.25" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

export const CareerScopedHeader = ({
  currentCourse,
  career,
  careerCourses,
  isHeaderVisible = false,
  announcementVisible = false,
  isLoading = false,
  deepNotesTitle = null,
  practiceTitle = null,
}: CareerScopedHeaderProps) => {

  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isModerator, isSeniorModerator, isSuperModerator } = useUserRole();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  // Prefetch course data on hover so clicking a tab is instant
  const prefetchCourse = (slug: string) => {
    queryClient.prefetchQuery({
      queryKey: courseDetailKey(slug, false),
      queryFn: () => fetchCourseDetail(slug, false),
      staleTime: 5 * 60 * 1000,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // primary header is gone — secondary header always sits at the very top
  const topClass = announcementVisible ? "top-9" : "top-0";

  // ── loading skeleton only — no-course state (e.g. /completed) renders normally ──
  if (isLoading) {
    return (
      <div
        className={cn(
          "hidden lg:block fixed left-0 right-0 z-50 transition-all duration-200 ease-out",
          "h-12 bg-white/[0.97] dark:bg-zinc-950/95 backdrop-blur-md",
          "border-b border-black/[0.07] dark:border-white/[0.07]",
          topClass
        )}
        style={{  }}
      >
        <div className="container mx-auto px-6 lg:px-12 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 rounded-full bg-muted-foreground/15 animate-pulse" />
            <div className="h-3.5 w-28 rounded bg-muted-foreground/15 animate-pulse" />
            <div className="h-3 w-3 rounded bg-muted-foreground/10 animate-pulse" />
            <div className="h-4 w-36 rounded bg-muted-foreground/15 animate-pulse" />
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-background/70 border border-border/50">
            {[80, 100, 88, 70, 76].map((w, i) => (
              <div
                key={i}
                className="h-6 rounded-full bg-muted-foreground/10 animate-pulse"
                style={{ width: w, animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const courseIdx = currentCourse ? careerCourses.findIndex((c) => c.slug === currentCourse.slug) : -1;

  return (
    <div
      className={cn(
        "hidden lg:block fixed left-0 right-0 z-50 transition-all duration-200 ease-out",
        "h-12 bg-white/[0.97] dark:bg-zinc-950/95 backdrop-blur-md",
        "border-b border-black/[0.07] dark:border-white/[0.07]",
        topClass
      )}
      style={{  }}
    >
      <div className="container mx-auto px-6 lg:px-12 h-full">
        <div className="flex items-center h-full gap-3">

          {/* ── Logo ────────────────────────────────────────────────────── */}
          <Link
            to="/"
            className="flex items-center flex-shrink-0"
            aria-label="UnlockMemory home"
          >
            <img src="/unlockMemory_icon.svg" alt="UnlockMemory" className="h-8 w-auto" />
          </Link>

          {/* ── Divider ─────────────────────────────────────────────────── */}
          <div className="h-4 w-px bg-border/50 flex-shrink-0" />

          {/* ── LEFT: breadcrumb — focus mode OR normal course breadcrumb ── */}
          {deepNotesTitle ? (
            /* Notes mode */
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <StickyNote className="h-[14px] w-[14px] flex-shrink-0 text-primary/60" />
              <span className="text-[13px] font-semibold text-foreground leading-none">Notes</span>
              <span className="text-border/60 mx-0.5 text-sm">—</span>
              <span className="text-[13px] font-medium text-muted-foreground/80 leading-none truncate max-w-[200px]">
                {deepNotesTitle}
              </span>
            </div>
          ) : practiceTitle ? (
            /* Practice focus mode */
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <Dumbbell className="h-[14px] w-[14px] flex-shrink-0 text-primary/60" />
              <span className="text-[13px] font-semibold text-foreground leading-none">Practice</span>
              <span className="text-border/60 mx-0.5 text-sm">—</span>
              <span className="text-[13px] font-medium text-muted-foreground/80 leading-none truncate max-w-[200px]">
                {practiceTitle}
              </span>
            </div>
          ) : (
            /* Normal course breadcrumb */
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">

              {/* Career path — clickable back to overview */}
              <Link
                to="?overview=true"
                className="group flex items-center gap-1.5 flex-shrink-0"
                title={`${career?.name ?? "Career"} overview`}
              >
                <OrbitIcon
                  className={cn(
                    "h-[14px] w-[14px] flex-shrink-0 transition-colors duration-150",
                    "text-primary/70 group-hover:text-primary"
                  )}
                />
                <span
                  className={cn(
                    "text-[12px] font-medium whitespace-nowrap leading-none",
                    "text-foreground/55 group-hover:text-foreground/90",
                    "transition-colors duration-150"
                  )}
                >
                  {career?.name ?? "Career Path"}
                </span>
              </Link>

              {currentCourse && (
                <>
                  {/* Separator */}
                  <ChevronRight className="h-3 w-3 flex-shrink-0 text-foreground/20" aria-hidden="true" />

                  {/* Current course name */}
                  <h2
                    className="text-[13px] font-semibold text-foreground/90 leading-none truncate max-w-[220px]"
                    title={currentCourse.name}
                  >
                    {currentCourse.name}
                  </h2>

                  {/* Position indicator — "2 / 5" */}
                  {careerCourses.length > 1 && courseIdx >= 0 && (
                    <span
                      className={cn(
                        "flex-shrink-0 text-[9.5px] font-bold leading-none px-1.5 py-[3px] rounded-[4px]",
                        "bg-primary/[0.09] text-primary/80 border border-primary/[0.22] font-mono tabular-nums"
                      )}
                    >
                      {courseIdx + 1}&thinsp;/&thinsp;{careerCourses.length}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Flexible gap ────────────────────────────────────────────── */}
          <div className="flex-1" />

          {/* ── RIGHT: flat tab-bar course navigation ────────────────────── */}
          {careerCourses.length > 0 && career ? (
            <nav
              className="flex items-center overflow-x-auto scrollbar-hide flex-shrink-0 h-full border-l border-black/[0.07] dark:border-white/[0.07]"
              aria-label="Career course navigation"
            >
              {careerCourses.map((course, idx) => {
                const isActive = !!currentCourse && course.slug === currentCourse.slug;
                const stepNum = String(idx + 1).padStart(2, "0");

                return (
                  <Link
                    key={course.id}
                    to={`/career-board/${career.slug}/course/${course.slug}`}
                    onMouseEnter={() => prefetchCourse(course.slug)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-1.5 px-4 h-full border-b-2",
                      "text-[12px] whitespace-nowrap flex-shrink-0",
                      "transition-colors duration-150 outline-none",
                      "focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-inset",
                      isActive
                        ? "border-primary text-foreground font-semibold bg-primary/[0.055]"
                        : "border-transparent text-foreground/45 font-medium hover:text-foreground/80 hover:bg-black/[0.03]"
                    )}
                  >
                    <span className={cn(
                      "text-[9.5px] font-bold leading-none flex-shrink-0 tabular-nums font-mono",
                      isActive ? "text-primary/85" : "text-foreground/28"
                    )}>
                      {stepNum}
                    </span>
                    <span className="leading-none">{course.name}</span>
                  </Link>
                );
              })}
            </nav>
          ) : (
            <span className="text-xs text-muted-foreground/60 italic flex-shrink-0">
              No courses in this path
            </span>
          )}

          {/* ── Right actions: theme + profile ──────────────────────────── */}
          <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
            <div className="scale-90 origin-center">
              <ThemeToggle />
            </div>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                aria-label="Profile"
                onMouseEnter={() => setProfileOpen(true)}
                onClick={() => setProfileOpen((p) => !p)}
                className="h-9 w-9 flex items-center justify-center rounded-[3px] text-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all duration-150 outline-none"
              >
                <UserCircle className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </button>

              <div
                onMouseLeave={() => setProfileOpen(false)}
                className={cn(
                  "absolute top-[calc(100%+6px)] right-0 w-[220px] z-[60]",
                  "transition-all duration-[160ms] ease-out origin-top-right",
                  profileOpen
                    ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                    : "opacity-0 -translate-y-2 scale-[0.96] pointer-events-none"
                )}
                style={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border) / 0.55)",
                  borderRadius: 6,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.08)",
                }}
              >
                {/* Account header */}
                <div className="px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "hsl(var(--muted-foreground) / 0.45)", marginBottom: 4 }}>
                    My Account
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate">{user?.email}</p>
                </div>

                {/* Admin / moderator links */}
                {(isAdmin || isModerator || isSeniorModerator || isSuperModerator) && (
                  <div className="px-2 pt-1.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setProfileOpen(false)}
                        className="group flex items-center px-2.5 py-2 rounded-[3px] hover:bg-muted/70 transition-colors duration-100 mb-0.5">
                        <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground">Platform Manager</span>
                      </Link>
                    )}
                    {isSuperModerator && !isAdmin && (
                      <Link to="/super-moderator" onClick={() => setProfileOpen(false)}
                        className="group flex items-center px-2.5 py-2 rounded-[3px] hover:bg-muted/70 transition-colors duration-100 mb-0.5">
                        <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground">Career Manager</span>
                      </Link>
                    )}
                    {isSeniorModerator && !isAdmin && (
                      <Link to="/senior-moderator" onClick={() => setProfileOpen(false)}
                        className="group flex items-center px-2.5 py-2 rounded-[3px] hover:bg-muted/70 transition-colors duration-100 mb-0.5">
                        <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground">Course Manager</span>
                      </Link>
                    )}
                    {isModerator && !isAdmin && (
                      <Link to="/moderator" onClick={() => setProfileOpen(false)}
                        className="group flex items-center px-2.5 py-2 rounded-[3px] hover:bg-muted/70 transition-colors duration-100 mb-0.5">
                        <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground">Content Moderator</span>
                      </Link>
                    )}
                    <div className="pb-1.5" />
                  </div>
                )}

                {/* Nav items */}
                <div className="px-2 py-1.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                  {[
                    { label: "Dashboard",    to: "/profile" },
                    { label: "My Learnings", to: "/profile?tab=learnings" },
                    { label: "Bookmarks",    to: "/profile?tab=bookmarks" },
                    { label: "Practice Lab", to: "/profile?tab=practice" },
                    { label: "Settings",     to: "/profile?tab=settings" },
                  ].map(({ label, to }) => (
                    <Link key={label} to={to} onClick={() => setProfileOpen(false)}
                      className="group flex items-center px-2.5 py-2 rounded-[3px] hover:bg-muted/70 transition-colors duration-100">
                      <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground">{label}</span>
                    </Link>
                  ))}
                </div>

                {/* Logout */}
                <div className="px-2 py-1.5">
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="group flex items-center w-full px-2.5 py-2 rounded-[3px] hover:bg-destructive/8 transition-colors duration-100 text-left"
                  >
                    <span className="text-[13px] font-medium text-destructive/70 group-hover:text-destructive">Log out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CareerScopedHeader;
