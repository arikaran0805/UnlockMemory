import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import {
  Tag, ArrowLeft, BookOpen, GraduationCap, Clock, Play,
  ChevronDown, ChevronUp, Search, X, TrendingUp, Flame,
  Bookmark, ChevronRight,
} from "lucide-react";
import { AdPlacement } from "@/components/AdPlacement";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { calculateReadingTime } from "@/lib/readingTime";
import { useDebounce } from "@/hooks/useDebounce";
import { useRecentlyViewedTags } from "@/hooks/useRecentlyViewedTags";
import { useTagBookmarks } from "@/hooks/useTagBookmarks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  published_at: string | null;
  course: {
    id: string;
    name: string;
    slug: string;
    level: string | null;
  } | null;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  level: string | null;
  description: string | null;
  featured_image: string | null;
}

interface RelatedTag {
  id: string;
  name: string;
  slug: string;
  count: number;
}

interface PopularTag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

type ContentFilter = "all" | "lessons" | "courses";
type LevelFilter = "all" | "Beginner" | "Intermediate" | "Advanced";

// ── Helpers ──────────────────────────────────────────────────────────────────

const getLevelStyle = (level: string | null): React.CSSProperties => {
  if (level === "Beginner")     return { background: "rgba(22,163,74,0.09)",  color: "#16a34a" };
  if (level === "Intermediate") return { background: "rgba(180,83,9,0.09)",   color: "#b45309" };
  if (level === "Advanced")     return { background: "rgba(185,28,28,0.09)",  color: "#b91c1c" };
  return { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" };
};

// ── Main component ────────────────────────────────────────────────────────────

const TagPosts = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [lessons,       setLessons]       = useState<Lesson[]>([]);
  const [courses,       setCourses]       = useState<Course[]>([]);
  const [relatedTags,   setRelatedTags]   = useState<RelatedTag[]>([]);
  const [tagName,       setTagName]       = useState("");
  const [loading,       setLoading]       = useState(true);
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [levelFilter,   setLevelFilter]   = useState<LevelFilter>("all");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [searchQuery,   setSearchQuery]   = useState("");
  const [popularTags,   setPopularTags]   = useState<PopularTag[]>([]);
  const [tagId,         setTagId]         = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [hoveredPill,   setHoveredPill]   = useState<string | null>(null);
  const [hasAd,         setHasAd]         = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { addRecentTag }     = useRecentlyViewedTags();
  const { user }             = useAuth();
  const { isBookmarked, toggleBookmark } = useTagBookmarks();

  useEffect(() => {
    fetchPopularTags();
    // Check for active tags-banner ad
    supabase
      .from("ads")
      .select("id, start_date, end_date")
      .eq("placement", "tags-banner")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!data?.length) return;
        const now = new Date();
        const ad = data[0];
        const active =
          (!ad.start_date || new Date(ad.start_date) <= now) &&
          (!ad.end_date   || new Date(ad.end_date)   >= now);
        setHasAd(active);
      });
  }, []);
  useEffect(() => { if (slug) fetchTagData(); }, [slug]);
  useEffect(() => {
    if (tagId && tagName && slug) addRecentTag({ id: tagId, name: tagName, slug });
  }, [tagId, tagName, slug, addRecentTag]);

  // ── Data fetching (unchanged) ─────────────────────────────────────────────

  const fetchPopularTags = async () => {
    try {
      const { data: postTagsData, error } = await supabase
        .from("post_tags")
        .select("tag_id, tags:tag_id (id, name, slug)");
      if (error) throw error;
      const tagCounts = new Map<string, { tag: PopularTag; count: number }>();
      postTagsData?.forEach(pt => {
        const tag = pt.tags as unknown as { id: string; name: string; slug: string };
        if (tag) {
          const existing = tagCounts.get(tag.id);
          if (existing) { existing.count++; }
          else { tagCounts.set(tag.id, { tag: { id: tag.id, name: tag.name, slug: tag.slug, postCount: 1 }, count: 1 }); }
        }
      });
      setPopularTags(
        Array.from(tagCounts.values())
          .map(({ tag, count }) => ({ ...tag, postCount: count }))
          .sort((a, b) => b.postCount - a.postCount)
          .slice(0, 12)
      );
    } catch (error) { console.error("Error fetching popular tags:", error); }
  };

  const fetchTagData = async () => {
    setLoading(true);
    try {
      const { data: tagData, error: tagError } = await supabase
        .from("tags").select("id, name").eq("slug", slug).single();
      if (tagError) throw tagError;
      setTagId(tagData.id);
      setTagName(tagData.name);

      const { data: postTagsData, error: postTagsError } = await supabase
        .from("post_tags").select("post_id").eq("tag_id", tagData.id);
      if (postTagsError) throw postTagsError;

      if (postTagsData && postTagsData.length > 0) {
        const postIds = postTagsData.map(pt => pt.post_id);

        const { data: lessonsData, error: lessonsError } = await supabase
          .from("posts")
          .select(`id,title,slug,content,published_at,category_id,courses:category_id (id, name, slug, level)`)
          .in("id", postIds)
          .order("published_at", { ascending: false });
        if (lessonsError) throw lessonsError;

        const formattedLessons: Lesson[] = (lessonsData || []).map(lesson => ({
          id: lesson.id, title: lesson.title, slug: lesson.slug,
          content: lesson.content, published_at: lesson.published_at,
          course: lesson.courses as Lesson["course"],
        }));
        setLessons(formattedLessons);

        const courseIds = [...new Set(formattedLessons.map(l => l.course?.id).filter(Boolean))] as string[];
        if (courseIds.length > 0) {
          const { data: coursesData, error: coursesError } = await supabase
            .from("courses").select("id, name, slug, level, description, featured_image")
            .in("id", courseIds).eq("status", "published");
          if (!coursesError && coursesData) setCourses(coursesData);
        }

        const { data: relatedTagsData, error: relatedTagsError } = await supabase
          .from("post_tags").select("tag_id, tags:tag_id (id, name, slug)")
          .in("post_id", postIds).neq("tag_id", tagData.id);
        if (!relatedTagsError && relatedTagsData) {
          const tagCounts = new Map<string, { tag: RelatedTag; count: number }>();
          relatedTagsData.forEach(pt => {
            const tag = pt.tags as unknown as { id: string; name: string; slug: string };
            if (tag) {
              const existing = tagCounts.get(tag.id);
              if (existing) { existing.count++; }
              else { tagCounts.set(tag.id, { tag: { ...tag, count: 1 }, count: 1 }); }
            }
          });
          setRelatedTags(
            Array.from(tagCounts.values())
              .map(({ tag, count }) => ({ ...tag, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 8)
          );
        }
      } else {
        setLessons([]); setCourses([]); setRelatedTags([]);
      }
    } catch (error) { console.error("Error fetching tag data:", error); }
    finally { setLoading(false); }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const filteredLessons = useMemo(() => lessons.filter(lesson => {
    if (levelFilter !== "all" && lesson.course?.level !== levelFilter) return false;
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      // Also match the current tag name — all content on this page IS tagged with it
      const matchesTag    = tagName.toLowerCase().includes(q);
      const matchesTitle  = lesson.title.toLowerCase().includes(q);
      const matchesCourse = lesson.course?.name.toLowerCase().includes(q);
      if (!matchesTitle && !matchesCourse && !matchesTag) return false;
    }
    return true;
  }), [lessons, levelFilter, debouncedSearchQuery, tagName]);

  const filteredCourses = useMemo(() => courses.filter(course => {
    if (levelFilter !== "all" && course.level !== levelFilter) return false;
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      // Also match the current tag name
      const matchesTag         = tagName.toLowerCase().includes(q);
      const matchesName        = course.name.toLowerCase().includes(q);
      const matchesDescription = course.description?.toLowerCase().includes(q);
      if (!matchesName && !matchesDescription && !matchesTag) return false;
    }
    return true;
  }), [courses, levelFilter, debouncedSearchQuery, tagName]);

  const lessonsByCourse = useMemo(() => {
    const grouped = new Map<string, { course: Course | null; lessons: Lesson[] }>();
    filteredLessons.forEach(lesson => {
      const courseId = lesson.course?.id || "uncategorized";
      const existing = grouped.get(courseId);
      if (existing) { existing.lessons.push(lesson); }
      else {
        const course = courses.find(c => c.id === courseId) || null;
        grouped.set(courseId, { course, lessons: [lesson] });
      }
    });
    return grouped;
  }, [filteredLessons, courses]);

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      next.has(courseId) ? next.delete(courseId) : next.add(courseId);
      return next;
    });
  };

  const showLessons = contentFilter === "all" || contentFilter === "lessons";
  const showCourses = contentFilter === "all" || contentFilter === "courses";
  const hasFilter   = Boolean(searchQuery) || levelFilter !== "all" || contentFilter !== "all";
  const hasContent  = lessons.length > 0 || courses.length > 0;

  const clearAll = () => {
    setSearchQuery("");
    setLevelFilter("all");
    setContentFilter("all");
  };

  // ── Filter pill renderer ──────────────────────────────────────────────────

  const Pill = ({
    id, active, onClick, children,
  }: { id: string; active: boolean; onClick: () => void; children: React.ReactNode }) => {
    const hovered = hoveredPill === id;
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHoveredPill(id)}
        onMouseLeave={() => setHoveredPill(null)}
        className="h-8 px-3.5 rounded-xl text-[12.5px] font-medium transition-all duration-150"
        style={{
          background: active
            ? "linear-gradient(135deg, #22A55D 0%, #1a9050 100%)"
            : hovered
            ? "rgba(34,165,93,0.08)"
            : "transparent",
          color: active ? "#fff" : "hsl(var(--foreground) / 0.65)",
          border: active ? "none" : "1px solid hsl(var(--border) / 0.5)",
          boxShadow: active ? "0 2px 8px rgba(34,165,93,0.25)" : "none",
        }}
      >
        {children}
      </button>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <SEOHead
        title={`Explore ${tagName} - Lessons & Courses`}
        description={`Discover lessons and courses related to ${tagName}. ${filteredLessons.length} lessons across ${filteredCourses.length} courses.`}
      />

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <div
        className="border-b border-border/40"
        style={{ background: "linear-gradient(180deg, #edf5ef 0%, #f4f9f5 50%, #f9fbf9 100%)" }}
      >
        <div className="container px-6 md:px-12 lg:px-16 xl:px-24 pt-10 pb-12">

          {/* Back */}
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 mb-8 text-[12.5px] font-medium text-muted-foreground/65 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          {/* Two-column when ad active, centered single column otherwise */}
          <div className={`flex flex-col lg:flex-row lg:items-stretch gap-8 ${!hasAd ? "lg:justify-center" : ""}`}>

            <div className={`flex flex-col ${hasAd ? "flex-1 min-w-0" : "w-full items-center text-center"}`}>

              {/* Eyebrow */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
                style={{
                  background: "rgba(34,165,93,0.07)",
                  border: "1px solid rgba(34,165,93,0.18)",
                  alignSelf: hasAd ? "flex-start" : "center",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full bg-[#22A55D]"
                  style={{ boxShadow: "0 0 4px rgba(34,165,93,0.6)" }}
                />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1a9050", letterSpacing: "0.025em" }}>
                  Topic Tag
                </span>
              </div>

              {/* Headline + bookmark */}
              <div className={`flex items-center gap-4 mb-4 ${!hasAd ? "justify-center" : ""}`}>
                {loading ? (
                  <div className="h-14 w-56 bg-muted/40 animate-pulse rounded-xl" />
                ) : (
                  <h1
                    className="text-foreground leading-[1.04]"
                    style={{ fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 800, letterSpacing: "-0.035em" }}
                  >
                    {tagName}
                  </h1>
                )}

                {!loading && tagId && (
                  <button
                    onClick={async () => {
                      if (!user) { toast.error("Please log in to bookmark tags"); return; }
                      const result = await toggleBookmark({ id: tagId, name: tagName, slug: slug || "" });
                      if (result.success) {
                        toast.success(isBookmarked(tagId) ? "Tag removed from favorites" : "Tag added to favorites");
                      }
                    }}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold transition-all duration-150"
                    style={
                      isBookmarked(tagId)
                        ? { background: "rgba(234,179,8,0.11)", color: "#b45309", border: "1px solid rgba(234,179,8,0.25)" }
                        : { background: "rgba(0,0,0,0.04)", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border) / 0.6)" }
                    }
                  >
                    <Bookmark className={cn("h-3.5 w-3.5", isBookmarked(tagId) && "fill-current")} />
                    {isBookmarked(tagId) ? "Saved" : "Save"}
                  </button>
                )}
              </div>

              {/* Description */}
              <p className="text-muted-foreground mb-8 max-w-[480px]" style={{ fontSize: 15.5, lineHeight: 1.7 }}>
                Explore lessons and courses tagged with{" "}
                <span className="font-semibold text-foreground/80">{tagName || "…"}</span>
              </p>

              {/* Stats */}
              {!loading && hasContent && (
                <div className={`flex items-center gap-6 mb-9 ${!hasAd ? "justify-center" : ""}`}>
                  <StatCard value={lessons.length} label="Lessons" />
                  <div className="w-px h-8 rounded-full bg-border/60" />
                  <StatCard value={courses.length} label="Courses" />
                  <div className="w-px h-8 rounded-full bg-border/60" />
                  <StatCard value="Free" label="To access" />
                </div>
              )}
              {loading && (
                <div className={`flex items-center gap-6 mb-9 ${!hasAd ? "justify-center" : ""}`}>
                  {[42, 36, 52].map((w, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="h-5 rounded bg-muted/50 animate-pulse" style={{ width: w }} />
                      <div className="h-3 w-10 rounded bg-muted/30 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1" />

              {/* Search bar */}
              {(hasContent || loading) && (
                <div className={`${hasAd ? "w-full" : "w-full max-w-[820px]"}`}>
                  <div
                    className="relative w-full rounded-2xl bg-surface-card transition-all duration-200"
                    style={{
                      border: searchFocused
                        ? "1.5px solid #22A55D"
                        : "1.5px solid hsl(var(--border) / 0.55)",
                      boxShadow: searchFocused
                        ? "0 0 0 4px rgba(34,165,93,0.1), 0 2px 8px rgba(0,0,0,0.07)"
                        : "0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.02)",
                    }}
                  >
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors duration-200"
                      style={{ color: searchFocused ? "#22A55D" : "hsl(var(--muted-foreground) / 0.55)" }}
                    />
                    <input
                      type="text"
                      placeholder="Search lessons and courses…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      className="w-full h-12 pl-11 pr-10 bg-transparent rounded-2xl text-[14px] placeholder:text-muted-foreground/40 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted/40 transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ad panel — only when an active tags-banner ad exists */}
            {hasAd && (
              <AdPlacement
                placement="tags-banner"
                className="hidden lg:block lg:w-[420px] xl:w-[468px] flex-shrink-0 rounded-2xl border border-border/50 overflow-hidden shadow-sm self-stretch"
              />
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          CONTENT
      ════════════════════════════════════════════════════════ */}
      <div className="container px-6 md:px-12 lg:px-16 xl:px-24 py-10">
        <div className="flex gap-10">

          {/* ── Main ── */}
          <div className="flex-1 min-w-0">

            {/* Filter pills */}
            {!loading && hasContent && (
              <div className="flex flex-wrap items-center gap-2 mb-7">
                {(["all", "lessons", "courses"] as ContentFilter[]).map((f) => (
                  <Pill
                    key={f}
                    id={`type-${f}`}
                    active={contentFilter === f}
                    onClick={() => setContentFilter(f)}
                  >
                    {f === "all" ? "All" : f === "lessons" ? "Lessons" : "Courses"}
                  </Pill>
                ))}

                <div className="w-px h-6 bg-border/50 mx-1" />

                {(["all", "Beginner", "Intermediate", "Advanced"] as LevelFilter[]).map((lv) => (
                  <Pill
                    key={lv}
                    id={`level-${lv}`}
                    active={levelFilter === lv}
                    onClick={() => setLevelFilter(lv)}
                  >
                    {lv === "all" ? "All Levels" : lv}
                  </Pill>
                ))}
              </div>
            )}

            {/* Results bar */}
            {hasFilter && !loading && (
              <div className="flex items-center justify-between mb-7">
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {showLessons ? filteredLessons.length : 0}
                  </span>{" "}
                  {filteredLessons.length === 1 ? "lesson" : "lessons"},{" "}
                  <span className="font-semibold text-foreground">
                    {showCourses ? filteredCourses.length : 0}
                  </span>{" "}
                  {filteredCourses.length === 1 ? "course" : "courses"}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
                <button
                  onClick={clearAll}
                  className="text-[12px] font-semibold text-[#22A55D] hover:text-[#1a9050] transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* ── Loading skeletons ── */}
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      border: "1px solid hsl(var(--border) / 0.5)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                      opacity: 1 - i * 0.12,
                    }}
                  >
                    <div className="h-10 bg-muted/40 animate-pulse" />
                    <div className="p-4 space-y-3 bg-surface-card">
                      {[0, 1, 2].map((j) => (
                        <div key={j} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-muted/40 animate-pulse flex-shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-muted/40 rounded animate-pulse w-2/3" />
                            <div className="h-2.5 bg-muted/25 rounded animate-pulse w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Empty state ── */}
            {!loading && !hasContent && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(34,165,93,0.07)" }}
                >
                  <Tag className="h-6 w-6 text-[#22A55D]/50" />
                </div>
                <p className="text-[15px] font-semibold text-foreground mb-1.5">
                  No content for this tag yet
                </p>
                <p className="text-[13px] text-muted-foreground mb-6 max-w-xs leading-relaxed">
                  Check back later or explore other topics.
                </p>
                <Link
                  to="/courses"
                  className="h-9 px-5 rounded-xl text-[13px] font-semibold bg-[#22A55D] text-white hover:bg-[#1a9050] transition-colors inline-flex items-center"
                >
                  Browse Courses
                </Link>
              </div>
            )}

            {/* ── Results ── */}
            {!loading && hasContent && (
              <div className="space-y-10">

                {/* Lessons section */}
                {showLessons && filteredLessons.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2.5 mb-5">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(34,165,93,0.1)" }}
                      >
                        <BookOpen className="h-3.5 w-3.5 text-[#22A55D]" />
                      </div>
                      <h2 className="text-[15px] font-semibold text-foreground">Lessons</h2>
                      <span className="text-[12.5px] text-muted-foreground/50 font-medium">
                        ({filteredLessons.length})
                      </span>
                    </div>

                    <div className="space-y-3">
                      {Array.from(lessonsByCourse.entries()).map(([courseId, { course, lessons: courseLessons }]) => {
                        const isExpanded = expandedCourses.has(courseId) || courseLessons.length <= 3;
                        const displayLessons = isExpanded ? courseLessons : courseLessons.slice(0, 3);
                        return (
                          <div
                            key={courseId}
                            className="rounded-2xl overflow-hidden"
                            style={{
                              border: "1px solid hsl(var(--border) / 0.5)",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                            }}
                          >
                            {/* Course header */}
                            {course && (
                              <div
                                className="flex items-center justify-between px-4 py-2.5"
                                style={{
                                  background: "rgba(34,165,93,0.04)",
                                  borderBottom: "1px solid hsl(var(--border) / 0.4)",
                                }}
                              >
                                <Link
                                  to={`/course/${course.slug}`}
                                  className="group flex items-center gap-2 min-w-0"
                                >
                                  <div
                                    className="w-1 h-4 rounded-full flex-shrink-0"
                                    style={{ background: "#22A55D" }}
                                  />
                                  <span className="text-[13px] font-semibold text-foreground/80 group-hover:text-[#22A55D] transition-colors truncate">
                                    {course.name}
                                  </span>
                                  {course.level && (
                                    <span
                                      className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                      style={getLevelStyle(course.level)}
                                    >
                                      {course.level}
                                    </span>
                                  )}
                                </Link>
                                <span className="text-[11.5px] text-muted-foreground/50 flex-shrink-0 ml-3">
                                  {courseLessons.length} lesson{courseLessons.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}

                            {/* Lessons list */}
                            <div className="divide-y divide-border/30 bg-surface-card">
                              {displayLessons.map((lesson) => (
                                <LessonCard key={lesson.id} lesson={lesson} />
                              ))}
                            </div>

                            {/* Expand / collapse */}
                            {courseLessons.length > 3 && (
                              <button
                                onClick={() => toggleCourseExpansion(courseId)}
                                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-medium text-muted-foreground/70 hover:text-[#22A55D] hover:bg-[rgba(34,165,93,0.04)] transition-colors bg-surface-card"
                                style={{ borderTop: "1px solid hsl(var(--border) / 0.3)" }}
                              >
                                {isExpanded ? (
                                  <><ChevronUp className="h-3.5 w-3.5" />Show less</>
                                ) : (
                                  <><ChevronDown className="h-3.5 w-3.5" />Show {courseLessons.length - 3} more lesson{courseLessons.length - 3 !== 1 ? "s" : ""}</>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Courses section */}
                {showCourses && filteredCourses.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2.5 mb-5">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(34,165,93,0.1)" }}
                      >
                        <GraduationCap className="h-3.5 w-3.5 text-[#22A55D]" />
                      </div>
                      <h2 className="text-[15px] font-semibold text-foreground">Courses</h2>
                      <span className="text-[12.5px] text-muted-foreground/50 font-medium">
                        ({filteredCourses.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCourses.map((course) => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          lessonCount={lessons.filter(l => l.course?.id === course.id).length}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* No filtered results */}
                {hasFilter && showLessons && filteredLessons.length === 0 && showCourses && filteredCourses.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: "rgba(34,165,93,0.07)" }}
                    >
                      <Search className="h-5 w-5 text-[#22A55D]/50" />
                    </div>
                    <p className="text-[14px] font-semibold text-foreground mb-1.5">
                      {searchQuery ? `No results for "${searchQuery}"` : "No content matches the selected filters"}
                    </p>
                    <p className="text-[12.5px] text-muted-foreground mb-5 max-w-xs leading-relaxed">
                      Try different filters or clear your search.
                    </p>
                    <button
                      onClick={clearAll}
                      className="h-8 px-4 rounded-xl text-[12.5px] font-semibold bg-[#22A55D] text-white hover:bg-[#1a9050] transition-colors"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

                {/* Related tags */}
                {relatedTags.length > 0 && (
                  <section
                    className="pt-8"
                    style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}
                  >
                    <p
                      className="font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3"
                      style={{ fontSize: 10.5 }}
                    >
                      Related Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {relatedTags.map((tag) => (
                        <Link
                          key={tag.id}
                          to={`/tag/${tag.slug}`}
                          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-xl text-[12px] font-medium transition-all duration-150 hover:bg-[rgba(34,165,93,0.1)] hover:text-[#15803d] hover:border-[rgba(34,165,93,0.25)]"
                          style={{
                            background: "hsl(var(--muted) / 0.6)",
                            color: "hsl(var(--foreground) / 0.7)",
                            border: "1px solid hsl(var(--border) / 0.4)",
                          }}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag.name}
                          <span className="text-muted-foreground/45" style={{ fontSize: 10.5 }}>
                            · {tag.count}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-4">

              {/* Popular Tags card */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid hsl(var(--border) / 0.5)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-2.5 px-4 py-3.5"
                  style={{
                    background: "rgba(249,115,22,0.05)",
                    borderBottom: "1px solid hsl(var(--border) / 0.4)",
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(249,115,22,0.13)" }}
                  >
                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <span className="text-[13px] font-semibold text-foreground">Popular Tags</span>
                </div>

                {/* Tags list */}
                {popularTags.length === 0 ? (
                  <div className="p-3 space-y-2 bg-surface-card">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-8 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="p-2 bg-surface-card space-y-0.5">
                    {popularTags.map((tag, i) => {
                      const isActive = slug === tag.slug;
                      const rankStyle =
                        i === 0 ? { bg: "rgba(234,179,8,0.15)",  color: "#a16207" } :
                        i === 1 ? { bg: "rgba(148,163,184,0.2)", color: "#64748b" } :
                        i === 2 ? { bg: "rgba(180,83,9,0.12)",   color: "#b45309" } :
                        null;
                      return (
                        <Link
                          key={tag.id}
                          to={`/tag/${tag.slug}`}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors duration-100",
                            isActive ? "bg-[rgba(34,165,93,0.08)]" : "hover:bg-muted/60"
                          )}
                        >
                          {rankStyle ? (
                            <span
                              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{ background: rankStyle.bg, color: rankStyle.color }}
                            >
                              {i + 1}
                            </span>
                          ) : (
                            <Tag className="flex-shrink-0 h-3 w-3 text-muted-foreground/40 ml-0.5" />
                          )}
                          <span
                            className="flex-1 min-w-0 truncate text-[13px] font-medium"
                            style={{ color: isActive ? "#15803d" : "hsl(var(--foreground) / 0.8)" }}
                          >
                            {tag.name}
                          </span>
                          <span className="flex-shrink-0 text-[11.5px] font-semibold text-muted-foreground/40">
                            {tag.postCount}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Browse all CTA */}
                <div
                  className="px-3 pb-3 pt-2 bg-surface-card"
                  style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}
                >
                  <Link
                    to="/tags"
                    className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-[12.5px] font-semibold transition-colors hover:bg-[rgba(34,165,93,0.12)]"
                    style={{
                      background: "rgba(34,165,93,0.07)",
                      color: "#15803d",
                      border: "1px solid rgba(34,165,93,0.15)",
                    }}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Browse All Tags
                  </Link>
                </div>
              </div>

              {/* Trending note */}
              <div className="flex items-center gap-1.5 px-2">
                <TrendingUp className="h-3 w-3 text-muted-foreground/35" />
                <span className="text-muted-foreground/40 font-medium" style={{ fontSize: 11 }}>
                  Based on lesson count
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-foreground leading-none font-bold"
        style={{ fontSize: 22, letterSpacing: "-0.03em" }}
      >
        {value}
      </span>
      <span className="font-medium" style={{ fontSize: 11.5, color: "#22A55D", letterSpacing: "0.01em" }}>
        {label}
      </span>
    </div>
  );
}

const LessonCard = ({ lesson }: { lesson: Lesson }) => {
  const readingTime = calculateReadingTime(lesson.content);
  return (
    <Link
      to={`/course/${lesson.course?.slug}?lesson=${lesson.slug}`}
      className="group flex items-center gap-3.5 px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center group-hover:bg-[rgba(34,165,93,0.15)] transition-colors"
        style={{ background: "rgba(34,165,93,0.08)" }}
      >
        <Play className="h-3.5 w-3.5 text-[#22A55D]" style={{ marginLeft: 1 }} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-[13.5px] font-medium text-foreground/85 group-hover:text-foreground truncate transition-colors">
          {lesson.title}
        </span>
        <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground/50 mt-0.5">
          <Clock className="h-2.5 w-2.5" />
          ~{readingTime} min
        </span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
};

const CourseCard = ({ course, lessonCount }: { course: Course; lessonCount: number }) => {
  return (
    <Link
      to={`/course/${course.slug}`}
      className="group flex items-start gap-4 p-4 rounded-2xl bg-surface-card transition-all duration-200 border border-border/50 hover:border-border/80 hover:shadow-md"
    >
      <div
        className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: "rgba(34,165,93,0.08)" }}
      >
        {course.featured_image ? (
          <img src={course.featured_image} alt={course.name} className="w-full h-full object-cover" />
        ) : (
          <GraduationCap className="h-6 w-6 text-[#22A55D]/60" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1.5">
          <h3 className="flex-1 font-semibold text-[13.5px] text-foreground/85 group-hover:text-foreground transition-colors line-clamp-1">
            {course.name}
          </h3>
          {course.level && (
            <span
              className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={getLevelStyle(course.level)}
            >
              {course.level}
            </span>
          )}
        </div>
        {course.description && (
          <p className="text-[12px] text-muted-foreground/60 line-clamp-2 mb-2 leading-relaxed">
            {course.description.replace(/<[^>]*>/g, "").slice(0, 120)}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground/50">
          <BookOpen className="h-3 w-3" />
          {lessonCount} tagged lesson{lessonCount !== 1 ? "s" : ""}
        </div>
      </div>
    </Link>
  );
};

export default TagPosts;
