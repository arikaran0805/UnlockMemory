import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, CornerDownLeft, Clock, TrendingUp, BookOpen, Briefcase } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCourseNavigation } from "@/hooks/useCourseNavigation";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Result {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  level?: string | null;
  type: "course" | "career";
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner:     "#16a34a",
  Intermediate: "#b45309",
  Advanced:     "#b91c1c",
};

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [courseResults, setCourseResults] = useState<Result[]>([]);
  const [careerResults, setCareerResults] = useState<Result[]>([]);
  const [recentCourses, setRecentCourses] = useState<Result[]>([]);
  const [recentCareers, setRecentCareers] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { navigateToCourse } = useCourseNavigation();

  const isSearching = query.trim().length >= 2;

  // When searching but careers don't match the query, fall back to showing recent careers
  const displayedCareers = isSearching
    ? (careerResults.length > 0 ? careerResults : recentCareers)
    : recentCareers;

  // Flat list of all displayed results for keyboard nav
  const allResults: Result[] = isSearching
    ? [...courseResults, ...displayedCareers]
    : [...recentCourses, ...recentCareers];

  const showViewAll = isSearching && allResults.length > 0;
  const totalItems = allResults.length + (showViewAll ? 1 : 0);

  // Focus + reset on open/close
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      fetchRecent();
    } else {
      setQuery("");
      setCourseResults([]);
      setCareerResults([]);
      setSelectedIndex(-1);
    }
  }, [open]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  // Debounced search
  useEffect(() => {
    if (!isSearching) {
      setCourseResults([]);
      setCareerResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsLoading(true);
      const [coursesRes, careersRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, name, slug, description, level")
          .ilike("name", `%${query}%`)
          .limit(5),
        supabase
          .from("careers")
          .select("id, name, slug, description")
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .eq("status", "published")
          .limit(4),
      ]);
      if (!coursesRes.error && coursesRes.data)
        setCourseResults(coursesRes.data.map((c: any) => ({ ...c, type: "course" as const })));
      if (!careersRes.error && careersRes.data)
        setCareerResults(careersRes.data.map((c: any) => ({ ...c, type: "career" as const, level: null })));
      setIsLoading(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query, isSearching]);

  const fetchRecent = async () => {
    const [coursesRes, careersRes] = await Promise.all([
      supabase.from("courses").select("id, name, slug, description, level").order("created_at", { ascending: false }).limit(4),
      supabase.from("careers").select("id, name, slug, description").eq("status", "published").order("display_order", { ascending: true }).limit(3),
    ]);
    if (!coursesRes.error && coursesRes.data)
      setRecentCourses(coursesRes.data.map((c: any) => ({ ...c, type: "course" as const })));
    if (!careersRes.error && careersRes.data)
      setRecentCareers(careersRes.data.map((c: any) => ({ ...c, type: "career" as const, level: null })));
  };

  const goToResult = useCallback(
    (r: Result) => {
      if (r.type === "course") {
        navigateToCourse(r.slug, r.id);
      } else {
        navigate(`/career/${r.slug}`);
      }
      onOpenChange(false);
    },
    [navigateToCourse, navigate, onOpenChange]
  );

  const goToSearch = useCallback(() => {
    if (query.trim()) {
      navigate(`/courses?search=${encodeURIComponent(query.trim())}`);
      onOpenChange(false);
    }
  }, [query, navigate, onOpenChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showViewAll && selectedIndex === allResults.length) {
        goToSearch();
      } else if (selectedIndex >= 0 && selectedIndex < allResults.length) {
        goToResult(allResults[selectedIndex]);
      } else {
        goToSearch();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelectorAll<HTMLElement>("[data-idx]")[selectedIndex];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Render a section of results
  const renderSection = (
    items: Result[],
    label: string,
    icon: React.ReactNode,
    globalOffset: number
  ) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-1.5 px-5 pt-4 pb-1.5">
          <span className="text-muted-foreground/40">{icon}</span>
          <span className="text-muted-foreground/50 font-semibold uppercase tracking-widest" style={{ fontSize: 10 }}>
            {label}
          </span>
        </div>
        {items.map((r, i) => {
          const idx = globalOffset + i;
          const isActive = selectedIndex === idx;
          const levelColor = LEVEL_COLORS[r.level ?? ""] ?? "#6b7280";
          return (
            <div className="px-2" key={r.id}>
              <button
                data-idx={idx}
                onClick={() => goToResult(r)}
                onMouseEnter={() => setSelectedIndex(idx)}
                onMouseLeave={() => setSelectedIndex(-1)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-100"
                style={{ background: isActive ? "hsl(var(--muted) / 0.7)" : "transparent" }}
              >
                <div
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ background: isActive ? "#22A55D" : "hsl(var(--border))" }}
                />
                <span
                  className="flex-1 min-w-0 font-medium truncate"
                  style={{
                    fontSize: 13.5,
                    color: isActive ? "hsl(var(--foreground))" : "hsl(var(--foreground) / 0.82)",
                  }}
                >
                  {r.name}
                </span>
                {r.level && (
                  <span className="flex-shrink-0 font-medium" style={{ fontSize: 11.5, color: levelColor, opacity: isActive ? 1 : 0.65 }}>
                    {r.level}
                  </span>
                )}
                <CornerDownLeft
                  className="flex-shrink-0 h-3.5 w-3.5"
                  style={{ color: "#22A55D", opacity: isActive ? 1 : 0, transition: "opacity 100ms" }}
                />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const hasAnyResults = allResults.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden border-border/60 [&>button:last-child]:hidden"
        style={{
          maxWidth: 620,
          borderRadius: 20,
          background: "hsl(var(--background))",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.08)",
        }}
      >
        {/* ── Search bar ── */}
        <div className="flex items-center gap-3 px-5 border-b border-border/50" style={{ height: 60 }}>
          {isLoading ? (
            <svg
              className="flex-shrink-0 animate-spin"
              width={17}
              height={17}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22A55D"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <Search className="flex-shrink-0 text-muted-foreground/45" style={{ width: 17, height: 17 }} />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search courses, career paths, topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-full bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground/35 text-foreground"
            style={{ fontSize: 14.5, caretColor: "#22A55D" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-muted/60 transition-colors"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground/50" />
            </button>
          )}
        </div>

        {/* ── Results ── */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: "calc(min(500px, 65vh))" }}>

          {/* Sections */}
          {!isLoading && hasAnyResults && (
            <div className="pb-2">
              {isSearching ? (
                <>
                  {renderSection(courseResults, "Courses", <BookOpen style={{ width: 11, height: 11 }} />, 0)}
                  {renderSection(
                    displayedCareers,
                    careerResults.length > 0 ? "Career Paths" : "Explore Careers",
                    <Briefcase style={{ width: 11, height: 11 }} />,
                    courseResults.length
                  )}
                </>
              ) : (
                <>
                  {renderSection(recentCourses, "Recent Courses", <Clock style={{ width: 11, height: 11 }} />, 0)}
                  {renderSection(recentCareers, "Career Paths", <Briefcase style={{ width: 11, height: 11 }} />, recentCourses.length)}
                </>
              )}

              {/* View all row */}
              {showViewAll && (
                <div className="px-2 mt-1" style={{ paddingTop: 6, borderTop: "1px solid hsl(var(--border) / 0.4)" }}>
                  <button
                    data-idx={allResults.length}
                    onClick={goToSearch}
                    onMouseEnter={() => setSelectedIndex(allResults.length)}
                    onMouseLeave={() => setSelectedIndex(-1)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-100"
                    style={{
                      background: selectedIndex === allResults.length ? "hsl(var(--muted) / 0.7)" : "transparent",
                    }}
                  >
                    <Search className="flex-shrink-0 text-muted-foreground/40" style={{ width: 13, height: 13 }} />
                    <span className="flex-1 text-muted-foreground/70" style={{ fontSize: 13 }}>
                      View all results for{" "}
                      <span className="font-semibold text-foreground/80">"{query}"</span>
                    </span>
                    <CornerDownLeft
                      className="flex-shrink-0 h-3.5 w-3.5"
                      style={{ color: "#22A55D", opacity: selectedIndex === allResults.length ? 1 : 0, transition: "opacity 100ms" }}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty / idle prompt */}
          {!isLoading && !hasAnyResults && !isSearching && (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(34,165,93,0.07)" }}
              >
                <Search style={{ width: 18, height: 18, color: "rgba(34,165,93,0.55)" }} />
              </div>
              <p className="font-medium text-foreground/70 mb-1" style={{ fontSize: 13.5 }}>
                Search everything
              </p>
              <p className="text-muted-foreground/50 leading-relaxed max-w-[220px]" style={{ fontSize: 12 }}>
                Courses, career paths, topics — find it fast
              </p>
            </div>
          )}

          {/* No results */}
          {!isLoading && isSearching && allResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="font-medium text-foreground/70 mb-1" style={{ fontSize: 13.5 }}>
                No results for "{query}"
              </p>
              <p className="text-muted-foreground/50 mb-5" style={{ fontSize: 12 }}>
                Try a different keyword or browse all courses
              </p>
              <button
                onClick={goToSearch}
                className="h-8 px-4 rounded-lg font-semibold transition-colors"
                style={{ fontSize: 12.5, background: "rgba(34,165,93,0.1)", color: "#15803d" }}
              >
                Browse all courses
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 border-t border-border/40"
          style={{ height: 42, background: "hsl(var(--muted) / 0.3)" }}
        >
          <div className="flex items-center gap-3.5">
            {[
              { key: "↑↓", label: "navigate" },
              { key: "↵", label: "open" },
              { key: "esc", label: "close" },
            ].map(({ key, label }) => (
              <span key={key} className="flex items-center gap-1.5">
                <kbd
                  className="font-mono inline-flex items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground/70"
                  style={{ fontSize: 10, fontWeight: 600, minWidth: 22, height: 20, padding: "0 5px", boxShadow: "0 1px 2px rgba(0,0,0,0.07)" }}
                >
                  {key}
                </kbd>
                <span className="text-muted-foreground/45" style={{ fontSize: 11 }}>{label}</span>
              </span>
            ))}
          </div>
          <span className="text-muted-foreground/35 font-medium" style={{ fontSize: 11 }}>
            UnlockMemory
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
