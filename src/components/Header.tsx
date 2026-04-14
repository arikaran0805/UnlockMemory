import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search, Menu, User, LogOut, Shield, UserCircle, LayoutDashboard,
  BookOpen, Bookmark, Gamepad2, FlaskConical, Library, Settings,
  ShoppingBag, ChevronRight,
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
import { useState, useEffect } from "react";
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
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isSeniorModerator, setIsSeniorModerator] = useState(false);
  const [isSuperModerator, setIsSuperModerator] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ site_name: "UnlockMemory" });
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro } = useUserState();
  const { itemCount } = useCareerPlan();

  const isProfilePage = location.pathname === "/profile";
  const hideOnPages = ["/choose-plan", "/careers", "/plan", "/checkout"].includes(location.pathname);
  const showCourseSecondaryHeaderDefault = !hideOnPages && !(isPro && isProfilePage);

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
        .select("id, name, slug")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (!error && data) setCourses(data);
    };

    fetchSiteSettings();
    fetchCourses();
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
              : "bg-background border-border/50",
          )}
        >
          <div className="container mx-auto px-6 lg:px-12">
            <div className="flex h-16 items-center justify-between gap-4">

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
                  <div className="hidden md:flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-9 w-9 flex items-center justify-center rounded-xl text-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-150">
                          <UserCircle className="h-[20px] w-[20px]" strokeWidth={1.6} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50">
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-0.5">
                            <p className="text-sm font-semibold">My Account</p>
                            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(isAdmin || isModerator || isSeniorModerator || isSuperModerator) && (
                          <>
                            {isAdmin && (
                              <DropdownMenuItem asChild>
                                <Link to="/admin" className="cursor-pointer">
                                  <Shield className="mr-2 h-4 w-4" /> Platform Manager
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {isSuperModerator && !isAdmin && (
                              <DropdownMenuItem asChild>
                                <Link to="/super-moderator" className="cursor-pointer">
                                  <Shield className="mr-2 h-4 w-4" /> Career Manager
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {isSeniorModerator && !isAdmin && (
                              <DropdownMenuItem asChild>
                                <Link to="/senior-moderator" className="cursor-pointer">
                                  <Shield className="mr-2 h-4 w-4" /> Course Manager
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {isModerator && !isAdmin && (
                              <DropdownMenuItem asChild>
                                <Link to="/moderator" className="cursor-pointer">
                                  <Shield className="mr-2 h-4 w-4" /> Content Moderator
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem asChild>
                          <Link to="/profile" className="cursor-pointer">
                            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/profile?tab=learnings" className="cursor-pointer">
                            <BookOpen className="mr-2 h-4 w-4" /> My Learnings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/profile?tab=bookmarks" className="cursor-pointer">
                            <Bookmark className="mr-2 h-4 w-4" /> Bookmarks
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/profile?tab=practice" className="cursor-pointer">
                            <FlaskConical className="mr-2 h-4 w-4" /> Practice Lab
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/profile?tab=settings" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" /> Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <LogOut className="mr-2 h-4 w-4" /> Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
