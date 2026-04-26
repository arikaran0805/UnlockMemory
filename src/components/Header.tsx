import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search, Menu, User, LogOut, Shield, UserCircle, LayoutDashboard,
  BookOpen, Bookmark, Gamepad2, FlaskConical, Settings,
  ShoppingBag, ChevronRight, ChevronDown,
  Brain, Database, Code2, BarChart3, Cpu, TrendingUp, Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useUserState } from "@/hooks/useUserState";
import { ThemeToggle } from "./ThemeToggle";
import { SearchDialog } from "./SearchDialog";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import { cn } from "@/lib/utils";

interface SiteSettings {
  site_name: string;
  logo_url?: string;
}

interface HeaderProps {
  announcementVisible?: boolean;
  autoHideOnScroll?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
  showCourseSecondaryHeader?: boolean;
}

const Header = ({
  announcementVisible = false,
  autoHideOnScroll,
  onVisibilityChange,
  showCourseSecondaryHeader: showCourseSecondaryHeaderOverride,
}: HeaderProps) => {
  const location = useLocation();
  const [courses, setCourses] = useState<any[]>([]);
  const [careers, setCareers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isSeniorModerator, setIsSeniorModerator] = useState(false);
  const [isSuperModerator, setIsSuperModerator] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ site_name: "UnlockMemory" });
  const [isScrolled, setIsScrolled] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [careersOpen, setCareersOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const careersRef = useRef<HTMLDivElement>(null);
  const practiceRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro } = useUserState();
  const { itemCount } = useCareerPlan();

  const isProfilePage = location.pathname === "/profile";
  const hideOnPages = ["/choose-plan", "/careers", "/plan", "/checkout"].includes(location.pathname);
  const showCourseSecondaryHeaderDefault = !hideOnPages && !isProfilePage;

  const showCourseSecondaryHeader =
    showCourseSecondaryHeaderOverride === undefined
      ? showCourseSecondaryHeaderDefault
      : showCourseSecondaryHeaderOverride === false
        ? false
        : showCourseSecondaryHeaderDefault;

  const isCourseDetailPage = location.pathname.startsWith("/course/");
  const shouldAutoHide = autoHideOnScroll ?? isCourseDetailPage;

  const { isHeaderVisible } = useScrollDirection({
    threshold: 15,
    enabled: shouldAutoHide,
    showOnlyAtTop: true,
  });

  useEffect(() => {
    onVisibilityChange?.(isHeaderVisible);
  }, [isHeaderVisible, onVisibilityChange]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (coursesRef.current && !coursesRef.current.contains(e.target as Node)) setCoursesOpen(false);
      if (careersRef.current && !careersRef.current.contains(e.target as Node)) setCareersOpen(false);
      if (practiceRef.current && !practiceRef.current.contains(e.target as Node)) setPracticeOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkUserRoles(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkUserRoles(session.user.id);
      else {
        setIsAdmin(false);
        setIsModerator(false);
        setIsSeniorModerator(false);
        setIsSuperModerator(false);
      }
    });

    const fetchSiteSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("site_name, logo_url")
        .limit(1)
        .maybeSingle();
      if (data) setSiteSettings({ site_name: data.site_name || "UnlockMemory", logo_url: data.logo_url || undefined });
    };

    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug, icon, level")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (!error && data) setCourses(data);
    };

    const fetchCareers = async () => {
      const { data } = await supabase
        .from("careers")
        .select("id, name, slug, icon")
        .eq("status", "published")
        .order("display_order", { ascending: true })
        .limit(6);
      if (data) setCareers(data);
    };

    fetchSiteSettings();
    fetchCourses();
    fetchCareers();
    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoles = async (userId: string) => {
    const [adminRes, modRes, seniorRes, superRes] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "senior_moderator" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "super_moderator" }),
    ]);
    setIsAdmin(!!adminRes.data);
    setIsModerator(!!modRes.data);
    setIsSeniorModerator(!!seniorRes.data);
    setIsSuperModerator(!!superRes.data);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Logged out", description: "You've been successfully logged out" });
      navigate("/");
    }
  };

  const headerHidden = shouldAutoHide && !isHeaderVisible;
  const isLandingPage = location.pathname === "/";

  // ── Nav panel design tokens ────────────────────────────────────────────────
  const NAV_ICON_MAP: Record<string, React.ElementType> = {
    BarChart3, Brain, Database, Code2, Cpu, TrendingUp, Briefcase, BookOpen,
    // common aliases
    BarChart2: BarChart3,
  };

  const NAV_PALETTE = [
    { bg: "rgba(34,165,93,0.09)",  text: "#15803d" },
    { bg: "rgba(59,130,246,0.09)", text: "#1d4ed8" },
    { bg: "rgba(168,85,247,0.09)", text: "#7c3aed" },
    { bg: "rgba(245,158,11,0.09)", text: "#b45309" },
    { bg: "rgba(239,68,68,0.09)",  text: "#b91c1c" },
    { bg: "rgba(20,184,166,0.09)", text: "#0f766e" },
  ];

  const CAREER_PALETTE = [
    { bg: "rgba(14,116,144,0.09)",  text: "#0e7490" },
    { bg: "rgba(34,165,93,0.09)",   text: "#15803d" },
    { bg: "rgba(124,58,237,0.09)",  text: "#6d28d9" },
    { bg: "rgba(245,158,11,0.09)",  text: "#b45309" },
    { bg: "rgba(239,68,68,0.09)",   text: "#b91c1c" },
    { bg: "rgba(59,130,246,0.09)",  text: "#1d4ed8" },
  ];

  // Shown while real careers are loading
  const FALLBACK_CAREERS = [
    { id: "ds", name: "Data Scientist",      slug: "", icon: "BarChart3" },
    { id: "ml", name: "ML Engineer",         slug: "", icon: "Cpu" },
    { id: "da", name: "Data Analyst",        slug: "", icon: "TrendingUp" },
    { id: "ai", name: "AI Product Manager",  slug: "", icon: "Brain" },
    { id: "nl", name: "NLP Engineer",        slug: "", icon: "Code2" },
    { id: "mo", name: "MLOps Engineer",      slug: "", icon: "Database" },
  ];

  // Current course slug for active state
  const activeCourseSlug = location.pathname.startsWith("/course/")
    ? location.pathname.split("/course/")[1]?.split("/")[0]
    : null;

  return (
    <>
      {/* ── Primary Header ─────────────────────────────────────────────────── */}
      <header
        className={cn(
          "fixed left-0 right-0 z-50 transition-all duration-300 ease-out",
          headerHidden
            ? "top-0 -translate-y-full opacity-0 pointer-events-none"
            : announcementVisible ? "top-9 translate-y-0 opacity-100" : "top-0 translate-y-0 opacity-100",
        )}
      >
        <div
          className={cn(
            "border-b transition-all duration-300",
            isScrolled
              ? "bg-background/90 backdrop-blur-xl border-border/60 shadow-[0_1px_12px_rgba(0,0,0,0.06)]"
              : isLandingPage
                ? "bg-transparent border-transparent"
                : "bg-background border-border/50",
          )}
        >
          <div className="container mx-auto px-6 lg:px-12">
            <div className="relative flex h-16 items-center justify-between gap-4">

              {/* Logo */}
              <Link
                to="/"
                className="flex items-center gap-2.5 group shrink-0 transition-transform duration-200 hover:scale-[1.02]"
              >
                {siteSettings.logo_url ? (
                  <img src={siteSettings.logo_url} alt={siteSettings.site_name} className="h-9 w-auto" />
                ) : (
                  <img src="/unlockMemory_icon.svg" alt={siteSettings.site_name} className="h-9 w-auto" />
                )}
                <span className="hidden sm:inline text-[15px] tracking-[-0.01em] text-foreground/90 group-hover:text-foreground transition-colors">
                  <span className="font-medium">Unlock</span><span className="font-bold">Memory</span>
                </span>
              </Link>

              {/* ── Primary Nav Dropdowns — absolutely centered ───────────── */}
              <nav className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">

                {/* ── Courses dropdown ──────────────────────────────────── */}
                <div
                  className="relative"
                  ref={coursesRef}
                >
                  <button
                    onMouseEnter={() => { setCoursesOpen(true); setCareersOpen(false); setPracticeOpen(false); setProfileOpen(false); }}
                    onClick={() => { setCoursesOpen((p) => !p); setCareersOpen(false); setPracticeOpen(false); setProfileOpen(false); }}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13.5px] font-semibold transition-colors duration-150 outline-none",
                      coursesOpen ? "text-primary" : "text-foreground/70 hover:text-foreground"
                    )}
                  >
                    Courses
                    <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform duration-200", coursesOpen && "rotate-180")} />
                  </button>

                  {/* Panel */}
                  <div
                    onMouseLeave={() => setCoursesOpen(false)}
                    className={cn(
                      "absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 w-[256px] z-50",
                      "transition-all duration-[160ms] ease-out origin-top",
                      coursesOpen
                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                        : "opacity-0 -translate-y-2 scale-[0.96] pointer-events-none"
                    )}
                    style={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border) / 0.55)",
                      borderRadius: 16,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.08)",
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "hsl(var(--muted-foreground) / 0.45)" }}>
                        Browse Courses
                      </span>
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, color: "#22A55D",
                        background: "rgba(34,165,93,0.08)", border: "1px solid rgba(34,165,93,0.16)",
                        borderRadius: 100, padding: "1px 8px",
                      }}>
                        {courses.length} courses
                      </span>
                    </div>

                    {/* Items */}
                    <div className="py-1.5">
                      {courses.slice(0, 6).map((course) => (
                        <Link
                          key={course.id}
                          to={`/course/${course.slug}`}
                          onClick={() => setCoursesOpen(false)}
                          className="group flex items-center gap-2 mx-2 px-3 py-2 rounded-xl hover:bg-muted/70 transition-colors duration-100"
                        >
                          <span className="flex-1 text-[13px] font-medium text-foreground/85 group-hover:text-foreground transition-colors truncate leading-snug">
                            {course.name}
                          </span>
                          <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/25 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
                        </Link>
                      ))}
                    </div>

                    {/* Footer CTA */}
                    <div className="px-2 pb-2.5">
                      <Link
                        to="/courses"
                        onClick={() => setCoursesOpen(false)}
                        className="group flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-[#22A55D]/[0.07] hover:bg-[#22A55D]/[0.12] border border-[#22A55D]/[0.12] hover:border-[#22A55D]/20 transition-all duration-150"
                      >
                        <span className="text-[12.5px] font-semibold text-[#15803d]">All Courses</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-[#22A55D]/60">{courses.length} total</span>
                          <ChevronRight className="h-3.5 w-3.5 text-[#22A55D] group-hover:translate-x-0.5 transition-transform duration-150" />
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* ── Careers dropdown ──────────────────────────────────── */}
                <div
                  className="relative"
                  ref={careersRef}
                >
                  <button
                    onMouseEnter={() => { setCareersOpen(true); setCoursesOpen(false); setPracticeOpen(false); setProfileOpen(false); }}
                    onClick={() => { setCareersOpen((p) => !p); setCoursesOpen(false); setPracticeOpen(false); setProfileOpen(false); }}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13.5px] font-semibold transition-colors duration-150 outline-none",
                      careersOpen ? "text-primary" : "text-foreground/70 hover:text-foreground"
                    )}
                  >
                    Careers
                    <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform duration-200", careersOpen && "rotate-180")} />
                  </button>

                  {/* Panel */}
                  <div
                    onMouseLeave={() => setCareersOpen(false)}
                    className={cn(
                      "absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 w-[256px] z-50",
                      "transition-all duration-[160ms] ease-out origin-top",
                      careersOpen
                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                        : "opacity-0 -translate-y-2 scale-[0.96] pointer-events-none"
                    )}
                    style={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border) / 0.55)",
                      borderRadius: 16,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.08)",
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "hsl(var(--muted-foreground) / 0.45)" }}>
                        Career Paths
                      </span>
                      {careers.length > 0 && (
                        <span style={{
                          fontSize: 10.5, fontWeight: 600, color: "#22A55D",
                          background: "rgba(34,165,93,0.08)", border: "1px solid rgba(34,165,93,0.16)",
                          borderRadius: 100, padding: "1px 8px",
                        }}>
                          {careers.length} paths
                        </span>
                      )}
                    </div>

                    {/* Items */}
                    <div className="py-1.5">
                      {(careers.length > 0 ? careers : FALLBACK_CAREERS).slice(0, 6).map((career) => (
                        <Link
                          key={career.id ?? career.name}
                          to={career.slug ? `/career/${career.slug}` : "/careers"}
                          onClick={() => setCareersOpen(false)}
                          className="group flex items-center gap-2 mx-2 px-3 py-2 rounded-xl hover:bg-muted/70 transition-colors duration-100"
                        >
                          <span className="flex-1 text-[13px] font-medium text-foreground/85 group-hover:text-foreground transition-colors truncate leading-snug">
                            {career.name}
                          </span>
                          <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/25 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
                        </Link>
                      ))}
                    </div>

                    {/* Footer CTA */}
                    <div className="px-2 pb-2.5">
                      <Link
                        to="/careers"
                        onClick={() => setCareersOpen(false)}
                        className="group flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-[#22A55D]/[0.07] hover:bg-[#22A55D]/[0.12] border border-[#22A55D]/[0.12] hover:border-[#22A55D]/20 transition-all duration-150"
                      >
                        <span className="text-[12.5px] font-semibold text-[#15803d]">All Career Paths</span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#22A55D] group-hover:translate-x-0.5 transition-transform duration-150" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* ── Practice dropdown ─────────────────────────────────── */}
                <div
                  className="relative"
                  ref={practiceRef}
                >
                  <button
                    onMouseEnter={() => { setPracticeOpen(true); setCoursesOpen(false); setCareersOpen(false); setProfileOpen(false); }}
                    onClick={() => { setPracticeOpen((p) => !p); setCoursesOpen(false); setCareersOpen(false); setProfileOpen(false); }}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13.5px] font-semibold transition-colors duration-150 outline-none",
                      practiceOpen ? "text-primary" : "text-foreground/70 hover:text-foreground"
                    )}
                  >
                    Practice
                    <ChevronDown className={cn("h-3.5 w-3.5 opacity-50 transition-transform duration-200", practiceOpen && "rotate-180")} />
                  </button>

                  {/* Panel */}
                  <div
                    onMouseLeave={() => setPracticeOpen(false)}
                    className={cn(
                      "absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 w-[256px] z-50",
                      "transition-all duration-[160ms] ease-out origin-top",
                      practiceOpen
                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                        : "opacity-0 -translate-y-2 scale-[0.96] pointer-events-none"
                    )}
                    style={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border) / 0.55)",
                      borderRadius: 16,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.08)",
                    }}
                  >
                    {/* Header */}
                    <div className="px-4 pt-3.5 pb-2.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "hsl(var(--muted-foreground) / 0.45)" }}>
                        Sharpen Your Skills
                      </span>
                    </div>

                    {/* Items */}
                    <div className="p-2">
                      {[
                        {
                          icon: FlaskConical,
                          label: "Practice Lab",
                          sub: "Interactive coding exercises",
                          to: user ? "/practice-lab" : "/login",
                          palette: { bg: "rgba(34,165,93,0.09)", text: "#15803d" },
                        },
                        {
                          icon: BookOpen,
                          label: "My Learnings",
                          sub: "Track your progress",
                          to: user ? "/profile?tab=learnings" : "/login",
                          palette: { bg: "rgba(168,85,247,0.09)", text: "#7c3aed" },
                        },
                      ].map(({ icon: Icon, label, sub, to, palette }) => (
                        <Link
                          key={label}
                          to={to}
                          onClick={() => setPracticeOpen(false)}
                          className="group flex items-start gap-3 px-2.5 py-2.5 rounded-xl hover:bg-muted/70 transition-colors duration-100"
                        >
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: palette.bg }}
                          >
                            <Icon style={{ width: 15, height: 15, color: palette.text, strokeWidth: 1.8 }} />
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span className="text-[13px] font-semibold text-foreground/90 group-hover:text-foreground transition-colors leading-snug">
                              {label}
                            </span>
                            <span className="text-[11.5px] text-muted-foreground/60 leading-snug">
                              {sub}
                            </span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/20 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150 mt-1.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

              </nav>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Right actions */}
              <div className="flex items-center gap-0.5">

                {/* Search */}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="relative h-9 w-9 flex items-center justify-center rounded-xl text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-150"
                  title="Search"
                >
                  <Search className="h-[17px] w-[17px]" strokeWidth={1.7} />
                </button>
                <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

                {/* Cart */}
                <button
                  onClick={() => navigate("/plan")}
                  className="relative h-9 w-9 flex items-center justify-center rounded-xl text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-150"
                  title="My Plan"
                >
                  <ShoppingBag className="h-[17px] w-[17px]" strokeWidth={1.7} />
                  {itemCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-[14px] min-w-[14px] px-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
                      {itemCount}
                    </span>
                  )}
                </button>

                {/* Theme */}
                <ThemeToggle />

                {/* User — desktop */}
                {user ? (
                  <div
                    className="hidden md:flex items-center relative"
                    ref={profileRef}
                  >
                    {/* Trigger */}
                    <button
                      onMouseEnter={() => { setProfileOpen(true); setCoursesOpen(false); setCareersOpen(false); setPracticeOpen(false); }}
                      onClick={() => { setProfileOpen((p) => !p); setCoursesOpen(false); setCareersOpen(false); setPracticeOpen(false); }}
                      className="h-9 w-9 flex items-center justify-center rounded-xl text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-150 outline-none focus:outline-none focus-visible:outline-none"
                    >
                      <UserCircle className="h-[20px] w-[20px]" strokeWidth={1.6} />
                    </button>

                    {/* Panel */}
                    <div
                      onMouseLeave={() => setProfileOpen(false)}
                      className={cn(
                        "absolute top-[calc(100%+6px)] right-0 w-[220px] z-50",
                        "transition-all duration-[160ms] ease-out origin-top-right",
                        profileOpen
                          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                          : "opacity-0 -translate-y-2 scale-[0.96] pointer-events-none"
                      )}
                      style={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border) / 0.55)",
                        borderRadius: 16,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.08)",
                      }}
                    >
                      {/* Account header */}
                      <div className="px-4 pt-3.5 pb-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "hsl(var(--muted-foreground) / 0.45)", marginBottom: 4 }}>
                          My Account
                        </p>
                        <p className="text-[12px] text-muted-foreground truncate">{user.email}</p>
                      </div>

                      {/* Admin / moderator links */}
                      {(isAdmin || isModerator || isSeniorModerator || isSuperModerator) && (
                        <div className="px-2 pt-1.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                          {isAdmin && (
                            <Link to="/admin" onClick={() => setProfileOpen(false)}
                              className="group flex items-center px-2.5 py-2 rounded-xl hover:bg-muted/70 transition-colors duration-100 mb-0.5">
                              <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground transition-colors">Platform Manager</span>
                            </Link>
                          )}
                          {isSuperModerator && !isAdmin && (
                            <Link to="/super-moderator" onClick={() => setProfileOpen(false)}
                              className="group flex items-center px-2.5 py-2 rounded-xl hover:bg-muted/70 transition-colors duration-100 mb-0.5">
                              <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground transition-colors">Career Manager</span>
                            </Link>
                          )}
                          {isSeniorModerator && !isAdmin && (
                            <Link to="/senior-moderator" onClick={() => setProfileOpen(false)}
                              className="group flex items-center px-2.5 py-2 rounded-xl hover:bg-muted/70 transition-colors duration-100 mb-0.5">
                              <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground transition-colors">Course Manager</span>
                            </Link>
                          )}
                          {isModerator && !isAdmin && (
                            <Link to="/moderator" onClick={() => setProfileOpen(false)}
                              className="group flex items-center px-2.5 py-2 rounded-xl hover:bg-muted/70 transition-colors duration-100 mb-0.5">
                              <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground transition-colors">Content Moderator</span>
                            </Link>
                          )}
                          <div className="pb-1.5" />
                        </div>
                      )}

                      {/* Main nav items */}
                      <div className="px-2 py-1.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
                        {[
                          { label: "Dashboard",    to: "/profile" },
                          { label: "My Learnings", to: "/profile?tab=learnings" },
                          { label: "Bookmarks",    to: "/profile?tab=bookmarks" },
                          { label: "Practice Lab", to: "/profile?tab=practice" },
                          { label: "Settings",     to: "/profile?tab=settings" },
                        ].map(({ label, to }) => (
                          <Link key={label} to={to} onClick={() => setProfileOpen(false)}
                            className="group flex items-center px-2.5 py-2 rounded-xl hover:bg-muted/70 transition-colors duration-100">
                            <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground transition-colors">
                              {label}
                            </span>
                          </Link>
                        ))}
                      </div>

                      {/* Logout */}
                      <div className="px-2 py-1.5">
                        <button
                          onClick={() => { setProfileOpen(false); handleLogout(); }}
                          className="group flex items-center w-full px-2.5 py-2 rounded-xl hover:bg-destructive/8 transition-colors duration-100 text-left"
                        >
                          <span className="text-[13px] font-medium text-destructive/70 group-hover:text-destructive transition-colors">
                            Log out
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                    className="hidden md:inline-flex items-center h-9 px-5 ml-1 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-all duration-150 shadow-[0_2px_12px_hsl(var(--primary)/0.30)]"
                  >
                    Get Started
                  </Link>
                )}

                {/* Mobile menu */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-150 ml-1">
                      <Menu className="h-5 w-5" strokeWidth={1.7} />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 border-l border-border/50 p-0">
                    <div className="flex flex-col h-full">
                      {/* Mobile header */}
                      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
                        <img src="/unlockMemory_icon.svg" alt={siteSettings.site_name} className="h-8 w-auto" />
                        <span className="text-[15px] font-semibold">{siteSettings.site_name}</span>
                      </div>

                      {/* Mobile nav */}
                      <nav className="flex-1 overflow-y-auto py-4 px-3">
                        {(isAdmin || isModerator) && (
                          <div className="mb-3 px-2">
                            <Badge className="bg-primary/15 text-primary border-0 text-[11px]">
                              {isAdmin ? "Platform Manager" : "Content Moderator"}
                            </Badge>
                          </div>
                        )}
                        <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 mb-1">
                          Courses
                        </p>
                        {courses.map((course) => (
                          <Link
                            key={course.id}
                            to={`/course/${course.slug}`}
                            className={cn(
                              "flex items-center px-3 py-2.5 text-[13.5px] font-medium rounded-lg transition-colors duration-150 mb-0.5",
                              activeCourseSlug === course.slug
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/75 hover:text-foreground hover:bg-muted",
                            )}
                          >
                            {course.name}
                          </Link>
                        ))}
                        <Link
                          to="/courses"
                          className="flex items-center gap-1.5 px-3 py-2.5 text-[13.5px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors duration-150 mt-1"
                        >
                          All Courses
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </nav>

                      {/* Mobile footer */}
                      <div className="px-3 py-4 border-t border-border/50 space-y-1">
                        {user ? (
                          <>
                            {(isAdmin || isModerator) && (
                              <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2.5 text-[13.5px] font-medium text-foreground/75 hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                                <Shield className="h-4 w-4" />
                                {isAdmin ? "Platform Manager" : "Moderator Dashboard"}
                              </Link>
                            )}
                            <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2.5 text-[13.5px] font-medium text-foreground/75 hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                              <User className="h-4 w-4" /> Profile
                            </Link>
                            <button
                              onClick={handleLogout}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13.5px] font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left"
                            >
                              <LogOut className="h-4 w-4" /> Logout
                            </button>
                          </>
                        ) : (
                          <Link
                            to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                            className="flex items-center justify-center w-full h-11 rounded-xl bg-primary text-primary-foreground text-[13.5px] font-semibold hover:bg-primary/90 transition-colors"
                          >
                            Get Started
                          </Link>
                        )}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Secondary Nav — Courses ─────────────────────────────────────────── */}
      {showCourseSecondaryHeader && (
        <div
          className={cn(
            "hidden lg:block fixed left-0 right-0 z-40 transition-all duration-300 ease-out",
            headerHidden
              ? announcementVisible ? "top-9" : "top-0"
              : announcementVisible ? "top-[6.25rem]" : "top-16",
          )}
        >
          <div className="bg-muted/50 backdrop-blur-sm border-b border-border/40">
            <div className="container mx-auto px-6 lg:px-12">
              <div className="relative flex items-center h-10">

                {/* Label */}
                <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40 mr-4 select-none">
                  Courses
                </span>

                {/* Divider */}
                <div className="w-px h-4 bg-border/60 shrink-0 mr-4" />

                {/* Scrollable course links */}
                <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
                  {courses.map((course) => {
                    const isActive = activeCourseSlug === course.slug;
                    return (
                      <Link
                        key={course.id}
                        to={`/course/${course.slug}`}
                        className={cn(
                          "relative shrink-0 px-3 py-1 text-[12.5px] font-medium rounded-md whitespace-nowrap transition-all duration-150",
                          isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        {isActive && (
                          <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary/60" />
                        )}
                        {course.name}
                      </Link>
                    );
                  })}
                </nav>

                {/* Right fade + All Courses link */}
                <div className="shrink-0 flex items-center pl-3 ml-1 border-l border-border/40">
                  <Link
                    to="/courses"
                    className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                  >
                    All Courses
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
