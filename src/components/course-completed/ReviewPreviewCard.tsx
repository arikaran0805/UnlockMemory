/**
 * ReviewPreviewCard - Social proof section showing learner reviews
 * 
 * Displays average rating, review count, and 1-2 short quotes
 * as calm, affirming social proof — not conversion pressure.
 */

import { Star, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ReviewPreviewCardProps {
  reviews: Review[];
  averageRating: number;
  onViewAllReviews?: () => void;
}

/** Extract plain text from a ProseMirror/TipTap JSON doc string, or return as-is. */
function extractPlainText(raw: string): string {
  try {
    const doc = JSON.parse(raw);
    if (doc?.type !== "doc" || !Array.isArray(doc.content)) return raw;
    const walk = (nodes: any[]): string =>
      nodes
        .map((node: any) => {
          if (node.type === "text") return node.text ?? "";
          if (node.type === "hardBreak") return " ";
          if (Array.isArray(node.content)) return walk(node.content);
          return "";
        })
        .join("");
    return walk(doc.content).trim();
  } catch {
    return raw;
  }
}

const ReviewPreviewCard = ({
  reviews,
  averageRating,
  onViewAllReviews,
}: ReviewPreviewCardProps) => {
  // Only show if there are reviews with written content
  const reviewsWithText = reviews.filter(r => r.review && r.review.trim().length > 0);
  
  if (reviews.length === 0) {
    return null;
  }

  // Get up to 2 short quotes (prioritize ones with text)
  const quotes = reviewsWithText
    .slice(0, 2)
    .map(r => ({
      id: r.id,
      text: extractPlainText(r.review!),
      author: r.profiles?.full_name || "Learner",
      rating: r.rating,
    }));

  // Truncate quotes to ~2 lines (roughly 120 chars)
  const truncateQuote = (text: string, maxLength = 120) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "…";
  };

  return (
    <Card className="p-6">
      {/* Section Title */}
      <h3 className="text-lg font-semibold text-foreground mb-4">
        What learners are saying
      </h3>

      {/* Rating Summary */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-5 w-5",
                star <= Math.round(averageRating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {averageRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
        </span>
      </div>

      {/* Quotes */}
      {quotes.length > 0 && (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="flex gap-3">
              <MessageCircle className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "{truncateQuote(quote.text)}"
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  — {quote.author}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View All Link */}
      {onViewAllReviews && reviews.length > 2 && (
        <button
          onClick={onViewAllReviews}
          className="mt-4 text-sm text-primary hover:underline"
        >
          View all reviews
        </button>
      )}
    </Card>
  );
};

export default ReviewPreviewCard;
