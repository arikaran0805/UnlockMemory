import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Search, X } from "lucide-react";
import { AdPlacement } from "@/components/AdPlacement";
import PublicCourseCard, { type PublicCourseCardCourse } from "@/components/PublicCourseCard";

interface CourseWithStats extends PublicCourseCardCourse {
  excerpt: string;
}

const LEVEL_ORDER = ["Beginner", "Intermediate", "Advanced"];

const Courses = () => {
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [hasAd, setHasAd] = useState(false);

  useEffect(() => {
    document.title = "All Courses - UnlockMemory";
    fetchCourses();
    // Check if a courses-banner ad is currently active so layout can adapt
    supabase
      .from("ads")
      .select("id, start_date, end_date")
      .eq("placement", "courses-banner")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!data?.length) return;
        const now = new Date();
        const ad = data[0];
        const active =
          (!ad.start_date || new Date(ad.start_date) <= now) &&
          (!ad.end_date || new Date(ad.end_date) >= now);
        setHasAd(active);
      });
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("courses")
      .select("id, name, slug, description, featured_image, level, icon, status")
      .eq("status", "published")
      .order("name", { ascending: true });

    if (!error && data) {
      const coursesWithStats = await Promise.all(
        data.map(async (course: any) => {
          const { count: enrollmentCount } = await supabase
            .from("course_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("course_id", course.id);

          const { data: reviews } = await supabase
            .from("course_reviews")
            .select("rating")
            .eq("course_id", course.id);

          const averageRating =
            reviews && reviews.length > 0
              ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              : 0;

          return {
            id: course.id,
            name: course.name,
            excerpt: course.description || "Explore this course and learn new skills",
            slug: course.slug,
            featured_image: course.featured_image,
            level: course.level ?? null,
            icon: course.icon ?? null,
            enrollmentCount: enrollmentCount || 0,
            averageRating,
          };
        })
      );
      setCourses(coursesWithStats);
    }
    setLoading(false);
  };

  // Always show all difficulty levels regardless of what's in the data
  const uniqueLevels = LEVEL_ORDER;

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          !q ||
          course.name.toLowerCase().includes(q) ||
          course.excerpt.toLowerCase().includes(q);
        const matchLevel = !selectedLevel || course.level === selectedLevel;
        return matchSearch && matchLevel;
      }),
    [courses, searchQuery, selectedLevel]
  );

  const hasFilter = Boolean(searchQuery || selectedLevel);
  const clearAll = () => {
    setSearchQuery("");
    setSelectedLevel(null);
  };

  return (
    <Layout>
      <SEOHead
        title="All Courses"
        description="Explore all our course categories and start learning"
      />

      {/* ════════════════════════════════════════════════════════
          HERO — eyebrow · headline · stats · search · filters
      ════════════════════════════════════════════════════════ */}
      <div
        className="border-b border-border/40"
        style={{
          background:
            "linear-gradient(180deg, #edf5ef 0%, #f4f9f5 50%, #f9fbf9 100%)",
        }}
      >
        <div className="container px-6 md:px-12 lg:px-16 xl:px-24 pt-16 pb-12">

          {/* ── Single flex row: left column owns everything; ad stretches to match ── */}
          <div className={`flex flex-col lg:flex-row lg:items-stretch gap-8 ${!hasAd ? "lg:justify-center" : ""}`}>

            {/* Left — headline · sub · stats · search · filters stacked as a column */}
            <div className={`flex flex-col ${hasAd ? "flex-1 min-w-0" : "w-full items-center text-center"}`}>

              {/* Eyebrow badge */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5 self-start"
                style={{
                  background: "rgba(34,165,93,0.07)",
                  border: "1px solid rgba(34,165,93,0.18)",
                  ...(hasAd ? {} : { alignSelf: "center" }),
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#22A55D]" style={{ boxShadow: "0 0 4px rgba(34,165,93,0.6)" }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1a9050", letterSpacing: "0.025em" }}>
                  Structured learning paths
                </span>
              </div>

              {/* Headline */}
              <h1
                className="text-foreground leading-[1.04] mb-4"
                style={{
                  fontSize: "clamp(38px, 5vw, 56px)",
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                }}
              >
                All Courses
              </h1>

              {/* Sub */}
              <p
                className={`text-muted-foreground mb-9 ${hasAd ? "max-w-[480px]" : "max-w-[480px]"}`}
                style={{ fontSize: 15.5, lineHeight: 1.7 }}
              >
                From fundamentals to advanced — every lesson engineered
                to build skills that actually stick.
              </p>

              {/* Stats row */}
              {!loading && (
                <div className={`flex items-center gap-6 mb-9 ${!hasAd ? "justify-center" : ""}`}>
                  <StatCard value={courses.length} label="Courses" />
                  <div className="w-px h-8 rounded-full bg-border/60" />
                  <StatCard value="Free" label="To start" />
                  <div className="w-px h-8 rounded-full bg-border/60" />
                  <StatCard value="Self-paced" label="Learning" />
                </div>
              )}

              {/* Loading stat skeleton */}
              {loading && (
                <div className={`flex items-center gap-6 mb-9 ${!hasAd ? "justify-center" : ""}`}>
                  {[40, 36, 60].map((w, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="h-5 rounded bg-muted/50 animate-pulse" style={{ width: w }} />
                      <div className="h-3 w-10 rounded bg-muted/30 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {/* Spacer pushes search+filters to the bottom of the column */}
              <div className="flex-1" />

              {/* Search + level filters — bottom of left column */}
              <div className={`flex flex-col sm:flex-row gap-3 items-center ${hasAd ? "w-full" : "w-full max-w-[820px]"}`}>

                {/* Search */}
                <div
                  className="relative flex-1 w-full rounded-2xl bg-surface-card transition-all duration-200"
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
                    placeholder="Search courses…"
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

                {/* Level pills */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <FilterPill
                    active={selectedLevel === null}
                    onClick={() => setSelectedLevel(null)}
                  >
                    All
                  </FilterPill>
                  {uniqueLevels.map((level) => (
                    <FilterPill
                      key={level}
                      active={selectedLevel === level}
                      onClick={() =>
                        setSelectedLevel(selectedLevel === level ? null : level)
                      }
                    >
                      {level}
                    </FilterPill>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — ad banner; only occupies space when an ad is actually active */}
            {hasAd && (
              <AdPlacement
                placement="courses-banner"
                className="hidden lg:block lg:w-[420px] xl:w-[468px] flex-shrink-0 rounded-2xl border border-border/50 overflow-hidden shadow-sm self-stretch"
              />
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          COURSES GRID
      ════════════════════════════════════════════════════════ */}
      <div className="container px-6 md:px-12 lg:px-16 xl:px-24 py-10">

        {/* Results bar */}
        {hasFilter && !loading && (
          <div className="flex items-center justify-between mb-7">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {filteredCourses.length}
              </span>{" "}
              {filteredCourses.length === 1 ? "course" : "courses"}
              {searchQuery && ` matching "${searchQuery}"`}
              {selectedLevel && ` · ${selectedLevel}`}
            </p>
            <button
              onClick={clearAll}
              className="text-[12px] font-semibold text-[#22A55D] hover:text-[#1a9050] transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  opacity: 1 - i * 0.08,
                }}
              >
                <div className="h-52 bg-muted/40 animate-pulse" />
                <div className="p-4 space-y-2.5 bg-surface-card border border-t-0 border-border/40 rounded-b-2xl">
                  <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted/30 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-muted/25 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredCourses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(34,165,93,0.07)" }}
            >
              <Search className="h-6 w-6 text-[#22A55D]/50" />
            </div>
            <p className="text-[15px] font-semibold text-foreground mb-1.5">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "No courses available"}
            </p>
            <p className="text-[13px] text-muted-foreground mb-6 max-w-xs leading-relaxed">
              Try a different keyword or remove the level filter to see all
              courses.
            </p>
            <button
              onClick={clearAll}
              className="h-9 px-5 rounded-xl text-[13px] font-semibold bg-[#22A55D] text-white hover:bg-[#1a9050] transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Courses grid */}
        {!loading && filteredCourses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course, index) => (
              <PublicCourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

// ── Local sub-components ────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-foreground leading-none font-bold"
        style={{ fontSize: 22, letterSpacing: "-0.03em" }}
      >
        {value}
      </span>
      <span
        className="font-medium"
        style={{ fontSize: 11.5, color: "#22A55D", letterSpacing: "0.01em" }}
      >
        {label}
      </span>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="h-10 px-4 rounded-xl text-[13px] font-medium border transition-all duration-150"
      style={
        active
          ? {
              background: "linear-gradient(135deg, #22A55D 0%, #1c9452 100%)",
              color: "white",
              borderColor: "#22A55D",
              boxShadow: "0 2px 8px rgba(34,165,93,0.28), 0 1px 2px rgba(34,165,93,0.15)",
            }
          : hovered
          ? {
              background: "rgba(34,165,93,0.06)",
              color: "hsl(var(--foreground))",
              borderColor: "rgba(34,165,93,0.28)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }
          : {
              background: "white",
              color: "hsl(var(--muted-foreground))",
              borderColor: "hsl(var(--border) / 0.5)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }
      }
    >
      {children}
    </button>
  );
}

export default Courses;
