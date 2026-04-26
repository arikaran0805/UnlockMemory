import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import {
  Tag, Search, X, Hash, TrendingUp, SortAsc,
  Grid3X3, List, ArrowLeft, Clock, Trash2, Bookmark,
  Star, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useRecentlyViewedTags } from "@/hooks/useRecentlyViewedTags";
import { useTagBookmarks } from "@/hooks/useTagBookmarks";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TagWithCount {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

type SortOption = "popular" | "alphabetical";
type ViewMode  = "grid" | "list";

const getTagFontSize = (postCount: number, maxCount: number): number => {
  const ratio = maxCount > 0 ? postCount / maxCount : 0;
  if (ratio > 0.7) return 15;
  if (ratio > 0.4) return 13.5;
  return 12;
};

// ── Main component ────────────────────────────────────────────────────────────

const Tags = () => {
  const [tags,           setTags]           = useState<TagWithCount[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [sortBy,         setSortBy]         = useState<SortOption>("popular");
  const [viewMode,       setViewMode]       = useState<ViewMode>("grid");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [hoveredSort,    setHoveredSort]    = useState<string | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { recentTags, removeRecentTag, clearRecentTags } = useRecentlyViewedTags();
  const { user } = useAuth();
  const { bookmarkedTags, isBookmarked, toggleBookmark } = useTagBookmarks();

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => { fetchTags(); }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data: tagsData, error: tagsError } = await supabase
        .from("tags").select("id, name, slug").eq("status", "approved").order("name");
      if (tagsError) throw tagsError;

      const { data: postTagsData, error: postTagsError } = await supabase
        .from("post_tags").select("tag_id");
      if (postTagsError) throw postTagsError;

      const tagCounts = new Map<string, number>();
      postTagsData?.forEach(pt => tagCounts.set(pt.tag_id, (tagCounts.get(pt.tag_id) || 0) + 1));

      setTags(
        (tagsData || []).map(tag => ({
          id: tag.id, name: tag.name, slug: tag.slug,
          postCount: tagCounts.get(tag.id) || 0,
        }))
      );
    } catch (error) { console.error("Error fetching tags:", error); }
    finally { setLoading(false); }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const filteredTags = useMemo(() => {
    let result = [...tags];
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }
    if (selectedLetter) {
      result = result.filter(t => t.name.toUpperCase().startsWith(selectedLetter));
    }
    result.sort((a, b) =>
      sortBy === "popular" ? b.postCount - a.postCount : a.name.localeCompare(b.name)
    );
    return result;
  }, [tags, debouncedSearchQuery, selectedLetter, sortBy]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    tags.forEach(t => { const l = t.name.charAt(0).toUpperCase(); if (/[A-Z]/.test(l)) set.add(l); });
    return set;
  }, [tags]);

  const totalTags         = tags.length;
  const totalPosts        = tags.reduce((s, t) => s + t.postCount, 0);
  const filteredPostCount = filteredTags.reduce((s, t) => s + t.postCount, 0);
  const isFiltered        = Boolean(debouncedSearchQuery || selectedLetter);
  const maxCount          = Math.max(...tags.map(t => t.postCount), 1);

  const clearFilters = () => { setSearchQuery(""); setSelectedLetter(null); };

  // ── Sort pill renderer ────────────────────────────────────────────────────

  const SortPill = ({
    id, value, icon, label,
  }: { id: string; value: SortOption; icon: React.ReactNode; label: string }) => {
    const active  = sortBy === value;
    const hovered = hoveredSort === id;
    return (
      <button
        onClick={() => setSortBy(value)}
        onMouseEnter={() => setHoveredSort(id)}
        onMouseLeave={() => setHoveredSort(null)}
        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[12.5px] font-medium transition-all duration-150"
        style={{
          background: active
            ? "linear-gradient(135deg, #22A55D 0%, #1a9050 100%)"
            : hovered ? "rgba(34,165,93,0.08)" : "transparent",
          color: active ? "#fff" : "hsl(var(--foreground) / 0.65)",
          border: active ? "none" : "1px solid hsl(var(--border) / 0.5)",
          boxShadow: active ? "0 2px 8px rgba(34,165,93,0.25)" : "none",
        }}
      >
        {icon}
        {label}
      </button>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <SEOHead
        title="Browse All Tags"
        description={`Explore ${totalTags} tags across ${totalPosts} lessons. Find topics that interest you.`}
      />

      <div className="container px-6 md:px-12 lg:px-16 xl:px-24">

        {/* ════════════════════════════════════════════════════════
            PAGE HEADER  (no hero gradient)
        ════════════════════════════════════════════════════════ */}
        <div className="pt-10 pb-8" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>

          {/* Back */}
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 mb-7 text-[12.5px] font-medium text-muted-foreground/65 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            {/* Title block */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(34,165,93,0.1)" }}
                >
                  <Hash className="h-5 w-5 text-[#22A55D]" />
                </div>
                <h1
                  className="text-foreground font-bold"
                  style={{ fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.025em" }}
                >
                  Browse All Tags
                </h1>
              </div>
              <p className="text-muted-foreground/65 ml-[52px]" style={{ fontSize: 14 }}>
                Discover topics and find lessons that match your interests
              </p>
            </div>

            {/* Stats */}
            {!loading && (
              <div className="flex items-center gap-5 sm:flex-shrink-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground font-bold leading-none" style={{ fontSize: 20, letterSpacing: "-0.03em" }}>
                    {isFiltered ? filteredTags.length : totalTags}
                  </span>
                  <span className="font-medium" style={{ fontSize: 11, color: "#22A55D" }}>Tags</span>
                </div>
                <div className="w-px h-7 rounded-full bg-border/60" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground font-bold leading-none" style={{ fontSize: 20, letterSpacing: "-0.03em" }}>
                    {isFiltered ? filteredPostCount : totalPosts}
                  </span>
                  <span className="font-medium" style={{ fontSize: 11, color: "#22A55D" }}>Lessons tagged</span>
                </div>
              </div>
            )}
            {loading && (
              <div className="flex items-center gap-5">
                {[28, 40].map((w, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="h-5 bg-muted/50 rounded animate-pulse" style={{ width: w }} />
                    <div className="h-2.5 w-14 bg-muted/30 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            MAIN CONTENT
        ════════════════════════════════════════════════════════ */}
        <div className="py-8 max-w-6xl">

          {/* ── Saved / favourite tags ── */}
          {user && bookmarkedTags.length > 0 && !loading && (
            <section className="mb-7">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                  Saved Tags
                </span>
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(234,179,8,0.15)", color: "#b45309" }}
                >
                  {bookmarkedTags.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {bookmarkedTags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/tag/${tag.slug}`}
                    className="group inline-flex items-center gap-1.5 h-7 px-3 rounded-xl text-[12px] font-medium transition-all duration-150 hover:bg-[rgba(234,179,8,0.12)] hover:border-[rgba(234,179,8,0.3)]"
                    style={{
                      background: "rgba(234,179,8,0.07)",
                      color: "#b45309",
                      border: "1px solid rgba(234,179,8,0.2)",
                    }}
                  >
                    <Star className="h-2.5 w-2.5 fill-current flex-shrink-0" />
                    {tag.name}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(tag); }}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Recently viewed ── */}
          {recentTags.length > 0 && !loading && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground/40" />
                  <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                    Recently Viewed
                  </span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground/45 hover:text-foreground transition-colors">
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear recently viewed tags?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all {recentTags.length} recently viewed tag{recentTags.length !== 1 ? "s" : ""} from your history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearRecentTags}>Clear All</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentTags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/tag/${tag.slug}`}
                    className="group inline-flex items-center gap-1.5 h-7 px-3 rounded-xl text-[12px] font-medium transition-all duration-150 hover:bg-[rgba(34,165,93,0.1)] hover:text-[#15803d] hover:border-[rgba(34,165,93,0.25)]"
                    style={{
                      background: "hsl(var(--muted) / 0.6)",
                      color: "hsl(var(--foreground) / 0.7)",
                      border: "1px solid hsl(var(--border) / 0.4)",
                    }}
                  >
                    <Tag className="h-2.5 w-2.5 flex-shrink-0" />
                    {tag.name}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeRecentTag(tag.id); }}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Search bar ── */}
          <div
            className="relative w-full rounded-2xl bg-white transition-all duration-200 mb-5"
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
              placeholder="Search tags…"
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

          {/* ── Controls: sort + view toggle ── */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <SortPill
                id="popular"
                value="popular"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Popular"
              />
              <SortPill
                id="alphabetical"
                value="alphabetical"
                icon={<SortAsc className="h-3.5 w-3.5" />}
                label="A–Z"
              />
            </div>

            {/* View mode toggle */}
            <div
              className="flex items-center gap-0.5 p-1 rounded-xl"
              style={{
                background: "hsl(var(--muted) / 0.5)",
                border: "1px solid hsl(var(--border) / 0.4)",
              }}
            >
              {([
                { mode: "grid" as ViewMode, icon: <Grid3X3 className="h-3.5 w-3.5" /> },
                { mode: "list" as ViewMode, icon: <List className="h-3.5 w-3.5" /> },
              ]).map(({ mode, icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="w-8 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
                  style={{
                    background: viewMode === mode ? "white" : "transparent",
                    color: viewMode === mode ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.55)",
                    boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* ── Alphabet filter ── */}
          <div className="flex flex-wrap gap-1 mb-6">
            <button
              onClick={() => setSelectedLetter(null)}
              className="w-8 h-8 rounded-lg text-[11px] font-bold transition-all duration-150"
              style={{
                background: selectedLetter === null
                  ? "linear-gradient(135deg, #22A55D 0%, #1a9050 100%)"
                  : "transparent",
                color: selectedLetter === null ? "#fff" : "hsl(var(--muted-foreground) / 0.65)",
                border: selectedLetter === null ? "none" : "1px solid hsl(var(--border) / 0.4)",
                boxShadow: selectedLetter === null ? "0 2px 6px rgba(34,165,93,0.25)" : "none",
              }}
            >
              All
            </button>
            {alphabet.map((letter) => {
              const has    = availableLetters.has(letter);
              const active = selectedLetter === letter;
              return (
                <button
                  key={letter}
                  onClick={() => has && setSelectedLetter(active ? null : letter)}
                  disabled={!has}
                  className="w-8 h-8 rounded-lg text-[11.5px] font-semibold transition-all duration-150"
                  style={{
                    background: active
                      ? "linear-gradient(135deg, #22A55D 0%, #1a9050 100%)"
                      : "transparent",
                    color: active ? "#fff" : has ? "hsl(var(--foreground) / 0.7)" : "hsl(var(--muted-foreground) / 0.22)",
                    border: active ? "none" : `1px solid ${has ? "hsl(var(--border) / 0.45)" : "hsl(var(--border) / 0.18)"}`,
                    boxShadow: active ? "0 2px 6px rgba(34,165,93,0.25)" : "none",
                    cursor: has ? "pointer" : "default",
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* ── Results bar ── */}
          {isFiltered && !loading && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredTags.length}</span>{" "}
                tag{filteredTags.length !== 1 ? "s" : ""}
                {searchQuery && ` matching "${searchQuery}"`}
                {selectedLetter && ` starting with "${selectedLetter}"`}
              </p>
              <button
                onClick={clearFilters}
                className="text-[12px] font-semibold text-[#22A55D] hover:text-[#1a9050] transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* ── Loading skeletons ── */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 bg-white"
                  style={{
                    border: "1px solid hsl(var(--border) / 0.5)",
                    opacity: 1 - i * 0.04,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-xl bg-muted/40 animate-pulse" />
                    <div className="h-3 w-5 rounded bg-muted/30 animate-pulse" />
                  </div>
                  <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4 mb-1.5" />
                  <div className="h-3 bg-muted/25 rounded animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && filteredTags.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "rgba(34,165,93,0.07)" }}
              >
                <Tag className="h-6 w-6 text-[#22A55D]/50" />
              </div>
              <p className="text-[15px] font-semibold text-foreground mb-1.5">
                {searchQuery || selectedLetter ? "No tags found" : "No tags yet"}
              </p>
              <p className="text-[13px] text-muted-foreground mb-6 max-w-xs leading-relaxed">
                {searchQuery || selectedLetter
                  ? "Try a different keyword or clear your filters."
                  : "Tags will appear here once content is added."}
              </p>
              {isFiltered && (
                <button
                  onClick={clearFilters}
                  className="h-9 px-5 rounded-xl text-[13px] font-semibold bg-[#22A55D] text-white hover:bg-[#1a9050] transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* ── Grid view ── */}
          {!loading && filteredTags.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="relative group">
                  <Link
                    to={`/tag/${tag.slug}`}
                    className="flex flex-col gap-3 p-4 rounded-2xl bg-white transition-all duration-200 border border-border/50 hover:border-border/80 hover:shadow-md"
                  >
                    {/* Icon */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:bg-[rgba(34,165,93,0.15)] transition-colors"
                      style={{ background: "rgba(34,165,93,0.08)" }}
                    >
                      <Tag className="h-3.5 w-3.5 text-[#22A55D]" />
                    </div>
                    {/* Name + meta */}
                    <div>
                      <h3
                        className="font-semibold text-foreground/85 group-hover:text-foreground truncate transition-colors"
                        style={{ fontSize: getTagFontSize(tag.postCount, maxCount) }}
                      >
                        {tag.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                        {tag.postCount} lesson{tag.postCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>

                  {/* Bookmark button */}
                  {user && (
                    <button
                      onClick={() =>
                        toggleBookmark(tag).then(result => {
                          if (result.success)
                            toast.success(isBookmarked(tag.id) ? "Removed from saved" : "Added to saved");
                        })
                      }
                      className={cn(
                        "absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150",
                        isBookmarked(tag.id)
                          ? "opacity-100 text-yellow-500"
                          : "opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:bg-muted/60"
                      )}
                      style={isBookmarked(tag.id) ? { background: "rgba(234,179,8,0.12)" } : {}}
                    >
                      <Bookmark className={cn("h-3 w-3", isBookmarked(tag.id) && "fill-current")} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── List view ── */}
          {!loading && filteredTags.length > 0 && viewMode === "list" && (
            <div className="space-y-2">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="group relative">
                  <Link
                    to={`/tag/${tag.slug}`}
                    className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white transition-all duration-200 border border-border/50 hover:border-border/80 hover:shadow-sm"
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center group-hover:bg-[rgba(34,165,93,0.15)] transition-colors"
                      style={{ background: "rgba(34,165,93,0.08)" }}
                    >
                      <Tag className="h-3.5 w-3.5 text-[#22A55D]" />
                    </div>
                    <span
                      className="flex-1 font-medium text-foreground/85 group-hover:text-foreground truncate transition-colors"
                      style={{ fontSize: 13.5 }}
                    >
                      {tag.name}
                    </span>
                    <span className="text-[12px] font-semibold text-muted-foreground/40 pr-14 flex-shrink-0">
                      {tag.postCount} lesson{tag.postCount !== 1 ? "s" : ""}
                    </span>
                  </Link>

                  {/* Bookmark */}
                  {user && (
                    <button
                      onClick={() =>
                        toggleBookmark(tag).then(result => {
                          if (result.success)
                            toast.success(isBookmarked(tag.id) ? "Removed from saved" : "Added to saved");
                        })
                      }
                      className={cn(
                        "absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150",
                        isBookmarked(tag.id)
                          ? "opacity-100 text-yellow-500"
                          : "opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:bg-muted/60"
                      )}
                      style={isBookmarked(tag.id) ? { background: "rgba(234,179,8,0.12)" } : {}}
                    >
                      <Bookmark className={cn("h-3 w-3", isBookmarked(tag.id) && "fill-current")} />
                    </button>
                  )}

                  {/* Chevron */}
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/25 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          )}

          {/* ── Tag cloud ── */}
          {!loading && !searchQuery && !selectedLetter && tags.length > 0 && (
            <section
              className="mt-12 pt-8"
              style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(34,165,93,0.1)" }}
                >
                  <TrendingUp className="h-3.5 w-3.5 text-[#22A55D]" />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">Tag Cloud</h2>
              </div>

              <div className="flex flex-wrap gap-2 items-baseline">
                {[...tags]
                  .sort((a, b) => b.postCount - a.postCount)
                  .slice(0, 30)
                  .map((tag) => {
                    const fs = getTagFontSize(tag.postCount, maxCount);
                    return (
                      <Link
                        key={tag.id}
                        to={`/tag/${tag.slug}`}
                        className="inline-flex items-center rounded-xl font-medium transition-all duration-150 hover:bg-[rgba(34,165,93,0.1)] hover:text-[#15803d] hover:border-[rgba(34,165,93,0.25)]"
                        style={{
                          fontSize: fs,
                          height: fs > 13 ? 30 : 26,
                          padding: fs > 13 ? "0 12px" : "0 10px",
                          background: "hsl(var(--muted) / 0.55)",
                          color: "hsl(var(--foreground) / 0.7)",
                          border: "1px solid hsl(var(--border) / 0.4)",
                        }}
                      >
                        {tag.name}
                      </Link>
                    );
                  })}
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Tags;
