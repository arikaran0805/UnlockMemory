import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Search, X } from "lucide-react";
import { AdPlacement } from "@/components/AdPlacement";
import PublicCareerCard, { type PublicCareerCardData } from "@/components/PublicCareerCard";

const Careers = () => {
  const [careers, setCareers] = useState<PublicCareerCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [hasAd, setHasAd] = useState(false);

  useEffect(() => {
    document.title = "Career Paths - UnlockMemory";
    fetchCareers();
    supabase
      .from("ads")
      .select("id, start_date, end_date")
      .eq("placement", "careers-banner")
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

  const fetchCareers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("careers")
      .select("id, name, description, icon, slug, career_courses(course_id, courses(id, name))")
      .eq("status", "published")
      .order("display_order", { ascending: true });

    if (!error && data) {
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select("course_id");

      const mapped: PublicCareerCardData[] = data.map((c: any) => {
        const coursesRaw: { name: string }[] = (c.career_courses || [])
          .filter((cc: any) => cc.courses)
          .map((cc: any) => ({ name: cc.courses.name }));
        const courseIds = (c.career_courses || [])
          .filter((cc: any) => cc.courses)
          .map((cc: any) => cc.courses.id);
        const enrollmentCount = enrollments
          ? enrollments.filter((e: any) => courseIds.includes(e.course_id)).length
          : 0;
        return {
          id: c.id,
          name: c.name,
          description: c.description || null,
          icon: c.icon || "Briefcase",
          slug: c.slug,
          courseCount: coursesRaw.length,
          enrollmentCount,
          courses: coursesRaw,
        };
      });
      setCareers(mapped);
    }
    setLoading(false);
  };

  const filteredCareers = useMemo(
    () =>
      careers.filter((career) => {
        const q = searchQuery.toLowerCase();
        return (
          !q ||
          career.name.toLowerCase().includes(q) ||
          (career.description && career.description.toLowerCase().includes(q)) ||
          career.courses.some((c) => c.name.toLowerCase().includes(q))
        );
      }),
    [careers, searchQuery]
  );

  const hasFilter = Boolean(searchQuery);
  const clearAll = () => setSearchQuery("");

  return (
    <Layout>
      <SEOHead
        title="Career Paths"
        description="Explore curated career paths and start your learning journey"
      />

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <div className="border-b border-border/40 hero-section-bg">
        <div className="container px-6 md:px-12 lg:px-16 xl:px-24 pt-16 pb-12">

          <div className={`flex flex-col lg:flex-row lg:items-stretch gap-8 ${!hasAd ? "lg:justify-center" : ""}`}>

            <div className={`flex flex-col ${hasAd ? "flex-1 min-w-0" : "w-full items-center text-center"}`}>

              {/* Eyebrow badge */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
                style={{
                  background: "rgba(34,165,93,0.07)",
                  border: "1px solid rgba(34,165,93,0.18)",
                  alignSelf: hasAd ? "flex-start" : "center",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#22A55D]" style={{ boxShadow: "0 0 4px rgba(34,165,93,0.6)" }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1a9050", letterSpacing: "0.025em" }}>
                  Curated learning journeys
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
                Career Paths
              </h1>

              {/* Sub */}
              <p
                className="text-muted-foreground mb-9 max-w-[480px]"
                style={{ fontSize: 15.5, lineHeight: 1.7 }}
              >
                Goal-oriented tracks with curated courses — pick a path,
                follow the roadmap, and build skills that employers want.
              </p>

              {/* Stats */}
              {!loading && (
                <div className={`flex items-center gap-6 mb-9 ${!hasAd ? "justify-center" : ""}`}>
                  <StatCard value={careers.length} label="Career paths" />
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

              <div className="flex-1" />

              {/* Search */}
              <div className={`flex flex-col sm:flex-row gap-3 items-center ${hasAd ? "w-full" : "w-full max-w-[820px]"}`}>
                <div
                  className="relative w-full rounded-2xl bg-card transition-all duration-200"
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
                    placeholder="Search career paths or courses…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="w-full h-12 pl-11 pr-10 bg-transparent rounded-2xl text-[14px] placeholder:text-muted-foreground/40 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearAll}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted/40 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {hasAd && (
              <AdPlacement
                placement="careers-banner"
                className="hidden lg:block lg:w-[420px] xl:w-[468px] flex-shrink-0 rounded-2xl border border-border/50 overflow-hidden shadow-sm self-stretch"
              />
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          CAREERS GRID
      ════════════════════════════════════════════════════════ */}
      <div className="container px-6 md:px-12 lg:px-16 xl:px-24 py-10">

        {/* Results bar */}
        {hasFilter && !loading && (
          <div className="flex items-center justify-between mb-7">
            <p className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {filteredCareers.length}
              </span>{" "}
              {filteredCareers.length === 1 ? "career path" : "career paths"}
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
                <div className="p-4 space-y-2.5 bg-card border border-t-0 border-border/40 rounded-b-2xl">
                  <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted/30 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-muted/25 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredCareers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(34,165,93,0.07)" }}
            >
              <Search className="h-6 w-6 text-[#22A55D]/50" />
            </div>
            <p className="text-[15px] font-semibold text-foreground mb-1.5">
              {searchQuery ? `No results for "${searchQuery}"` : "No career paths available"}
            </p>
            <p className="text-[13px] text-muted-foreground mb-6 max-w-xs leading-relaxed">
              Try a different keyword to find the career path you're looking for.
            </p>
            <button
              onClick={clearAll}
              className="h-9 px-5 rounded-xl text-[13px] font-semibold bg-[#22A55D] text-white hover:bg-[#1a9050] transition-colors"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Careers grid */}
        {!loading && filteredCareers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCareers.map((career, index) => (
              <PublicCareerCard key={career.id} career={career} index={index} />
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

export default Careers;
