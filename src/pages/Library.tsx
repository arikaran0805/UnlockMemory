import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCourseNavigation } from "@/hooks/useCourseNavigation";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, 
  Clock, 
  Users, 
  Search, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  TrendingUp,
  Play,
  GraduationCap,
  Award,
  Library as LibraryIcon,
  ChevronDown,
  Trophy,
  CheckCircle2
} from "lucide-react";

interface CourseWithStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured_image: string | null;
  level: string | null;
  enrollmentCount: number;
  lessonCount: number;
  averageRating: number | null;
  progress?: number;
  authorName?: string;
  authorAvatar?: string;
  completedAt?: string;
  nextLesson?: { title: string; order: number } | null;
}

interface Certificate {
  id: string;
  courseName: string;
  courseSlug: string;
  courseImage: string | null;
  completedAt: string;
  lessonCount: number;
}

const levelFilters = ["All", "Beginner", "Intermediate", "Advanced"];

const Library = () => {
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseWithStats[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [careerCourseIds, setCareerCourseIds] = useState<string[]>([]);
  const [enrollments24h, setEnrollments24h] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeNav, setActiveNav] = useState("all-courses");
  const [userId, setUserId] = useState<string | null>(null);
  const [aiPicksExpanded, setAiPicksExpanded] = useState(true);
  const navigate = useNavigate();
  const { navigateToCourse, handleResume } = useCourseNavigation();


  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      // Fetch user's selected career and related courses
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("selected_career")
          .eq("id", user.id)
          .single();
        
        if (profile?.selected_career) {
          const { data: careerCourses } = await supabase
            .from("career_courses")
            .select("course_id")
            .eq("career_id", profile.selected_career);
          
          if (careerCourses) {
            setCareerCourseIds(careerCourses.map(cc => cc.course_id));
          }
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: coursesData, error } = await supabase
          .from("courses")
          .select("*")
          .eq("status", "published")
          .order("name");

        if (error) throw error;

        // Get 24h ago timestamp
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Fetch 24h enrollment counts for all courses
        const { data: recentEnrollments } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .gte("enrolled_at", twentyFourHoursAgo);
        
        // Count enrollments per course in last 24h
        const enrollmentCounts: Record<string, number> = {};
        recentEnrollments?.forEach(e => {
          enrollmentCounts[e.course_id] = (enrollmentCounts[e.course_id] || 0) + 1;
        });
        setEnrollments24h(enrollmentCounts);

        const coursesWithStats = await Promise.all(
          (coursesData || []).map(async (course) => {
            const [{ count: enrollmentCount }, { count: lessonCount }, { data: reviews }] = await Promise.all([
              supabase
                .from("course_enrollments")
                .select("*", { count: "exact", head: true })
                .eq("course_id", course.id),
              supabase
                .from("posts")
                .select("*", { count: "exact", head: true })
                .eq("category_id", course.id),
              supabase
                .from("course_reviews")
                .select("rating")
                .eq("course_id", course.id),
            ]);

            const avgRating = reviews && reviews.length > 0
              ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
              : null;

            return {
              ...course,
              enrollmentCount: enrollmentCount || 0,
              lessonCount: lessonCount || 0,
              averageRating: avgRating,
              authorName: "Emojilearn Team",
              authorAvatar: undefined,
            };
          })
        );

        setCourses(coursesWithStats);

        if (userId) {
          const { data: enrollments } = await supabase
            .from("course_enrollments")
            .select("course_id, enrolled_at")
            .eq("user_id", userId);

          if (enrollments && enrollments.length > 0) {
            const enrolledIds = enrollments.map(e => e.course_id);
            const enrolled = coursesWithStats.filter(c => enrolledIds.includes(c.id));
            
            const enrolledWithProgress = await Promise.all(
              enrolled.map(async (course) => {
                const [{ count: completedLessons }, { data: allLessons }, { data: completedLessonIds }] = await Promise.all([
                  supabase
                    .from("lesson_progress")
                    .select("*", { count: "exact", head: true })
                    .eq("course_id", course.id)
                    .eq("user_id", userId)
                    .eq("completed", true),
                  (supabase
                    .from("course_lessons" as any)
                    .select("id, title, lesson_rank")
                    .eq("course_id", course.id)
                    .eq("is_published", true)
                    .is("deleted_at", null)
                    .order("lesson_rank", { ascending: true }) as unknown as Promise<{ data: { id: string; title: string; lesson_rank: string | null }[] | null; error: any }>),
                  supabase
                    .from("lesson_progress")
                    .select("lesson_id")
                    .eq("course_id", course.id)
                    .eq("user_id", userId)
                    .eq("completed", true),
                ]);
                
                const totalLessons = allLessons?.length || 0;
                const progress = totalLessons > 0 
                  ? Math.round(((completedLessons || 0) / totalLessons) * 100) 
                  : 0;
                
                // Find next incomplete lesson
                const completedIds = new Set(completedLessonIds?.map(l => l.lesson_id) || []);
                const nextLessonData = allLessons?.find(lesson => !completedIds.has(lesson.id));
                const nextLesson = nextLessonData 
                  ? { title: nextLessonData.title, order: allLessons?.indexOf(nextLessonData) ?? 0 }
                  : null;
                
                return { ...course, progress, nextLesson };
              })
            );
            
            setEnrolledCourses(enrolledWithProgress);

            // Find completed courses (100% progress) for certificates
            const completedCourses = enrolledWithProgress
              .filter(c => c.progress === 100)
              .map(c => ({
                id: c.id,
                courseName: c.name,
                courseSlug: c.slug,
                courseImage: c.featured_image,
                completedAt: new Date().toISOString(),
                lessonCount: c.lessonCount,
              }));
            setCertificates(completedCourses);
          }
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [userId]);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "All" || course.level?.toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const beginnerCourses = courses.filter(c => c.level?.toLowerCase() === "beginner").slice(0, 3);
  
  // Recommended courses: prioritize courses linked to user's career, fallback to filtered
  const recommendedCourses = careerCourseIds.length > 0
    ? filteredCourses.filter(c => careerCourseIds.includes(c.id)).slice(0, 4)
    : filteredCourses.slice(0, 4);
  
  // Popular courses: sort by 24h enrollment count
  const popularCourses = [...filteredCourses]
    .sort((a, b) => (enrollments24h[b.id] || 0) - (enrollments24h[a.id] || 0))
    .slice(0, 4);

  const estimatedHours = (lessonCount: number) => Math.max(1, Math.round((lessonCount * 15) / 60));

  const getLevelColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case "beginner": return "bg-emerald-500/90 text-white";
      case "intermediate": return "bg-amber-500/90 text-white";
      case "advanced": return "bg-rose-500/90 text-white";
      default: return "bg-primary/90 text-primary-foreground";
    }
  };

  const navItems = [
    { id: "all-courses", label: "All Courses", icon: LibraryIcon },
    { id: "my-learning", label: "My Learning", icon: GraduationCap },
    { id: "certificates", label: "Certificates", icon: Award },
  ];

  // Strip HTML tags from description
  const stripHtml = (html: string | null) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, '').trim();
  };

  const CourseCard = ({ course, showProgress = false, nextLesson }: { course: CourseWithStats; showProgress?: boolean; nextLesson?: { title: string; order: number } | null }) => {
    const cleanDescription = stripHtml(course.description);
    
    return (
      <Card
        className="overflow-hidden cursor-pointer group border h-[160px]"
        style={{
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: '20px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.02)',
          transition: 'all 220ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.02)';
        }}
        onClick={() => navigateToCourse(course.slug, course.id)}
      >
        <div className="flex h-full">
          {/* Left Section - Premium gradient */}
          <div 
            className="w-1/3 p-4 flex flex-col justify-between"
            style={{ background: 'linear-gradient(135deg, #047857, #065F46)', borderRadius: '20px 0 0 20px' }}
          >
            <div>
              <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Course
              </span>
              <h3 className="text-sm font-semibold text-white mt-1 leading-tight line-clamp-3">
                {course.name}
              </h3>
            </div>
            <div className="flex items-center gap-1 text-xs mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span>View all</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>

          {/* Right Section - Light */}
          <div className="w-2/3 p-4 flex flex-col justify-between" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  {course.level || "Beginner"} • {course.lessonCount} Lessons
                </span>
                {showProgress && course.progress !== undefined && (
                  <span className="text-[10px] font-semibold" style={{ color: '#16A34A' }}>{course.progress}%</span>
                )}
              </div>
              {showProgress && course.progress !== undefined && (
                <div className="w-full overflow-hidden mb-2" style={{ height: '6px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)' }}>
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${course.progress}%`, 
                      background: 'linear-gradient(90deg, #22C55E, #16A34A)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              )}
              {/* Next Lesson */}
              {showProgress && nextLesson && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Play className="h-3 w-3 text-primary fill-primary" />
                  <span className="text-[10px] text-muted-foreground">Next:</span>
                  <span className="text-[10px] font-medium text-foreground truncate">
                    {nextLesson.title}
                  </span>
                </div>
              )}
              <p className="text-xs text-foreground/80 line-clamp-2">
                {cleanDescription || "Start your learning journey"}
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium">{course.averageRating?.toFixed(1) || "0"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">{course.enrollmentCount || 0}</span>
                </div>
              </div>
              <Button 
                variant="default" 
                size="sm"
                className="text-white rounded-full px-4 h-7 text-xs border-0"
                style={{ 
                  background: 'linear-gradient(180deg, #22C55E, #16A34A)',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (showProgress && course.progress && course.progress > 0) {
                    handleResume(course.slug, course.id);
                  } else {
                    navigateToCourse(course.slug, course.id);
                  }
                }}
              >
                {showProgress ? "Continue" : "Start"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    badge
  }: { 
    title: string; 
    icon?: React.ComponentType<{ className?: string }>; 
    badge?: string;
  }) => (
    <div className="flex items-center gap-3 mb-8 mt-2">
      {Icon && (
        <div className="p-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)' }}>
          <Icon className="h-5 w-5 text-primary" />
        </div>
      )}
      <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', letterSpacing: '-0.02em' }}>{title}</h2>
      {badge && (
        <Badge variant="secondary" className="bg-primary/10 text-primary border-0 gap-1 px-3 py-1">
          <Sparkles className="h-3 w-3" />
          {badge}
        </Badge>
      )}
    </div>
  );

  const SidebarCourseItem = ({ course }: { course: CourseWithStats }) => (
    <button
      onClick={() => navigate(`/course/${course.slug}`)}
      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
        <BookOpen className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm text-foreground/80 truncate">{course.name}</span>
    </button>
  );

  return (
    <Layout>
      <SEOHead
        title="Course Library | Browse All Courses"
        description="Explore our complete library of courses. Find the perfect course to advance your career."
      />
      
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-border bg-muted/30 flex-shrink-0 hidden lg:block">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-8">
              {/* Navigation Links */}
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all text-left ${
                      activeNav === item.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              {/* AI Picks Section */}
              <div>
                <button 
                  onClick={() => setAiPicksExpanded(!aiPicksExpanded)}
                  className="flex items-center gap-2 w-full mb-4 text-left"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-semibold text-sm">AI Picks</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground ml-auto transition-transform ${aiPicksExpanded ? "rotate-180" : ""}`} />
                </button>
                
                {aiPicksExpanded && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-2 mb-3">Beginner Friendly</p>
                    {beginnerCourses.length > 0 ? (
                      beginnerCourses.map((course) => (
                        <SidebarCourseItem key={course.id} course={course} />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground px-2">No beginner courses yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Referenced Courses */}
              {enrolledCourses.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground px-2 mb-3 flex items-center gap-2">
                    <Award className="h-3 w-3" />
                    Recently Viewed
                  </p>
                  <div className="space-y-2">
                    {enrolledCourses.slice(0, 3).map((course) => (
                      <button
                        key={course.id}
                        onClick={() => navigateToCourse(course.slug, course.id)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          {course.featured_image ? (
                            <img src={course.featured_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-xs font-medium truncate">{course.name}</p>
                          <p className="text-xs text-muted-foreground">{course.progress}% complete</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main 
          className="flex-1 overflow-auto"
          style={{ 
            background: 'linear-gradient(180deg, #F8FBF9 0%, #F3F8F5 100%)',
          }}
        >
          {/* Subtle radial highlight */}
          <div 
            className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] z-0"
            style={{ 
              background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.04) 0%, transparent 70%)',
            }}
          />
          <div className="container mx-auto px-4 lg:px-8 py-10 max-w-6xl relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1C2E25', letterSpacing: '-0.025em' }}>
                {activeNav === "all-courses" && "Course Library"}
                {activeNav === "my-learning" && "My Learning"}
                {activeNav === "certificates" && "My Certificates"}
              </h1>
              
              {/* Search - hide on certificates */}
              {activeNav !== "certificates" && (
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-11 rounded-full bg-muted/50 border-0 focus-visible:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Filter Tabs - only show for all-courses */}
            {activeNav === "all-courses" && (
              <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                {levelFilters.map((filter) => (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full px-6 transition-all ${
                      activeFilter === filter 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "bg-muted/50 border-0 hover:bg-muted"
                    }`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter === "All" && "All ≡"}
                    {filter !== "All" && `› ${filter}`}
                  </Button>
                ))}
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="outline" className="gap-1 px-3 py-1.5 rounded-full">
                    <Clock className="h-3 w-3 text-amber-500" />
                    24h
                  </Badge>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-12">
                {[...Array(3)].map((_, sectionIdx) => (
                  <div key={sectionIdx}>
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="overflow-hidden h-[160px]">
                          <div className="flex h-full">
                            {/* Left Section Skeleton - Dark */}
                            <div className="w-1/3 p-4 flex flex-col justify-between" style={{ background: '#14532d' }}>
                              <div>
                                <Skeleton className="h-3 w-16 mb-2 bg-slate-700" />
                                <Skeleton className="h-5 w-full mb-1 bg-slate-700" />
                                <Skeleton className="h-5 w-3/4 bg-slate-700" />
                              </div>
                              <Skeleton className="h-3 w-16 bg-slate-700" />
                            </div>
                            {/* Right Section Skeleton - Light */}
                            <div className="w-2/3 bg-card p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Skeleton className="h-3 w-20" />
                                  <Skeleton className="h-3 w-12" />
                                </div>
                                <Skeleton className="h-1 w-full mb-3" />
                                <Skeleton className="h-4 w-full mb-1" />
                                <Skeleton className="h-4 w-3/4" />
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Skeleton className="h-4 w-10" />
                                  <Skeleton className="h-4 w-10" />
                                </div>
                                <Skeleton className="h-7 w-20 rounded-full" />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* All Courses View */}
                {activeNav === "all-courses" && (
                  <div className="space-y-12">
                    {/* Continue Learning Section */}
                    {enrolledCourses.length > 0 && (
                      <section>
                        <SectionHeader title="Continue Learning" icon={Play} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {enrolledCourses.map((course) => (
                            <CourseCard key={course.id} course={course} showProgress nextLesson={course.nextLesson} />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Recommended for You Section */}
                    <section>
                      <SectionHeader title="Recommended for You" icon={Sparkles} badge="AI Picks" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recommendedCourses.length > 0 ? (
                          recommendedCourses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                          ))
                        ) : (
                          <div className="text-center py-16 col-span-full">
                            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No courses found</h3>
                            <p className="text-muted-foreground">
                              {searchQuery ? "Try a different search term" : "Check back later for new courses"}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Popular This Week Section */}
                    {popularCourses.length > 0 && (
                      <section>
                        <SectionHeader title="Popular This Week" icon={TrendingUp} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {popularCourses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* All Courses Grid */}
                    {filteredCourses.length > 0 && (
                      <section>
                        <h2 className="text-xl font-bold mb-6">All Courses</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredCourses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* My Learning View */}
                {activeNav === "my-learning" && (
                  <div className="space-y-8">
                    {!userId ? (
                      <div 
                        className="text-center py-16 px-8"
                        style={{
                          background: 'rgba(255,255,255,0.9)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '24px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div className="mx-auto mb-5 w-fit" style={{ background: 'rgba(34,197,94,0.08)', padding: '16px', borderRadius: '14px' }}>
                          <GraduationCap className="h-10 w-10 text-primary" />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }} className="mb-2">Sign in to track your learning</h3>
                        <p className="text-muted-foreground mb-6 text-sm">
                          Create an account to enroll in courses and track your progress
                        </p>
                        <Button 
                          onClick={() => navigate("/auth")}
                          className="text-white border-0"
                          style={{ 
                            background: 'linear-gradient(180deg, #22C55E, #16A34A)',
                            borderRadius: '999px',
                            padding: '12px 26px',
                            boxShadow: '0 10px 24px rgba(34,197,94,0.35)',
                            transition: 'all 200ms ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >Sign In</Button>
                      </div>
                    ) : enrolledCourses.length === 0 ? (
                      <div 
                        className="text-center py-16 px-8"
                        style={{
                          background: 'rgba(255,255,255,0.9)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '24px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div className="mx-auto mb-5 w-fit" style={{ background: 'rgba(34,197,94,0.08)', padding: '16px', borderRadius: '14px' }}>
                          <BookOpen className="h-10 w-10 text-primary" />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937' }} className="mb-2">No courses yet</h3>
                        <p className="text-muted-foreground mb-6 text-sm">
                          Start learning by enrolling in a course
                        </p>
                        <Button 
                          onClick={() => setActiveNav("all-courses")}
                          className="text-white border-0"
                          style={{ 
                            background: 'linear-gradient(180deg, #22C55E, #16A34A)',
                            borderRadius: '999px',
                            padding: '12px 26px',
                            boxShadow: '0 10px 24px rgba(34,197,94,0.35)',
                            transition: 'all 200ms ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >Browse Courses</Button>
                      </div>
                    ) : (
                      <>
                        {/* In Progress */}
                        <section>
                          <div className="flex items-center gap-3 mb-8 mt-2">
                            <div className="p-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)' }}>
                              <Play className="h-5 w-5 text-primary" />
                            </div>
                            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937', letterSpacing: '-0.02em' }}>
                              In Progress ({enrolledCourses.filter(c => (c.progress || 0) < 100).length})
                            </h2>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {enrolledCourses
                              .filter(c => (c.progress || 0) < 100)
                              .map((course) => (
                                <CourseCard key={course.id} course={course} showProgress nextLesson={course.nextLesson} />
                              ))}
                          </div>
                        </section>

                        {/* Completed */}
                        {enrolledCourses.filter(c => c.progress === 100).length > 0 && (
                          <section>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              Completed ({enrolledCourses.filter(c => c.progress === 100).length})
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {enrolledCourses
                                .filter(c => c.progress === 100)
                                .map((course) => (
                                  <CourseCard key={course.id} course={course} showProgress nextLesson={course.nextLesson} />
                                ))}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Certificates View */}
                {activeNav === "certificates" && (
                  <div className="space-y-8">
                    {!userId ? (
                      <div className="text-center py-16">
                        <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Sign in to view certificates</h3>
                        <p className="text-muted-foreground mb-6">
                          Complete courses to earn certificates
                        </p>
                        <Button onClick={() => navigate("/auth")}>Sign In</Button>
                      </div>
                    ) : certificates.length === 0 ? (
                      <div className="text-center py-16">
                        <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No certificates yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Complete a course to earn your first certificate
                        </p>
                        <Button onClick={() => setActiveNav("all-courses")}>Start Learning</Button>
                      </div>
                    ) : (
                            <div className="flex flex-col gap-4">
                        {certificates.map((cert) => (
                          <Card
                            key={cert.id}
                            className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10"
                            onClick={() => navigate(`/course/${cert.courseSlug}`)}
                          >
                            <div className="p-6 text-center">
                              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                                <Award className="h-10 w-10 text-white" />
                              </div>
                              <Badge className="bg-emerald-500 text-white border-0 mb-3">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                              <h3 className="font-semibold text-lg mb-2">{cert.courseName}</h3>
                              <p className="text-sm text-muted-foreground mb-4">
                                {cert.lessonCount} lessons completed
                              </p>
                              <div className="pt-4 border-t border-amber-200 dark:border-amber-800">
                                <p className="text-xs text-muted-foreground">
                                  Certificate of Completion
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Library;
