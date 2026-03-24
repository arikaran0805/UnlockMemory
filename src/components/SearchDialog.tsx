import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight, BookOpen } from "lucide-react";
import UMLoader from "@/components/UMLoader";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCourseNavigation } from "@/hooks/useCourseNavigation";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  level: string | null;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { navigateToCourse } = useCourseNavigation();

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      fetchRecentCourses();
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Search courses as user types
  useEffect(() => {
    const searchCourses = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, slug, description, level')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (!error && data) {
        setResults(data);
      }
      setIsLoading(false);
    };

    const debounce = setTimeout(searchCourses, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const fetchRecentCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, slug, description, level')
      .order('created_at', { ascending: false })
      .limit(4);

    if (!error && data) {
      setRecentCourses(data);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/courses?search=${encodeURIComponent(query.trim())}`);
      onOpenChange(false);
    }
  };

  const handleCourseClick = (slug: string, courseId: string) => {
    navigateToCourse(slug, courseId);
    onOpenChange(false);
  };

  const displayResults = query.trim().length >= 2 ? results : recentCourses;
  const showingRecent = query.trim().length < 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
        {/* Search Input */}
        <form onSubmit={handleSubmit} className="relative border-b border-border">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search courses, lessons, topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-16 pl-14 pr-12 text-lg bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </form>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <UMLoader size={44} label="Unlocking memory…" />
            </div>
          ) : displayResults.length > 0 ? (
            <div className="p-4">
              <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {showingRecent ? "Recent Courses" : "Search Results"}
              </p>
              <div className="space-y-1">
                {displayResults.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleCourseClick(course.slug, course.id)}
                    className="w-full flex items-start gap-4 p-4 rounded-xl hover:bg-primary/10 transition-all duration-200 group text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {course.name}
                      </h4>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {course.description.replace(/<[^>]*>/g, '').substring(0, 100)}
                        </p>
                      )}
                      {course.level && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                          {course.level}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No courses found for "{query}"</p>
              <button
                onClick={handleSubmit}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Search className="h-4 w-4" />
                Search all content
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>Type to search courses and lessons</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↵</kbd>
              to search
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">esc</kbd>
              to close
            </span>
          </div>
          <span>Powered by UnlockMemory</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}