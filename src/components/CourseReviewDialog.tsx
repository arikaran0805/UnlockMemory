import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Star, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { LightEditor, type LightEditorRef } from "@/components/tiptap";
import { RichTextRenderer } from "@/components/tiptap";

interface Review {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user_id: string;
  is_anonymous?: boolean;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CourseReviewDialogProps {
  children: React.ReactNode;
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  userReview: { rating: number; review: string | null } | null;
  isEnrolled: boolean;
  isAuthenticated: boolean;
  onSubmitReview: (rating: number, review: string, isAnonymous?: boolean) => Promise<boolean>;
  onDeleteReview: () => Promise<boolean>;
}

const StarRating = ({ 
  rating, 
  onChange, 
  readonly = false,
  size = "md"
}: { 
  rating: number; 
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? '' : 'cursor-pointer hover:scale-110'} transition-transform`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const CourseReviewDialog = ({
  children,
  reviews,
  averageRating,
  reviewCount,
  userReview,
  isEnrolled,
  isAuthenticated,
  onSubmitReview,
  onDeleteReview,
}: CourseReviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [review, setReview] = useState(userReview?.review || "");
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const editorRef = useRef<LightEditorRef>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    
    setSubmitting(true);
    const success = await onSubmitReview(rating, review, postAnonymously);
    if (success) {
      setOpen(false);
      editorRef.current?.clear();
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const success = await onDeleteReview();
    if (success) {
      setRating(0);
      setReview("");
      editorRef.current?.clear();
    }
    setDeleting(false);
  };

  const getDisplayName = (r: Review) => {
    if (r.is_anonymous) {
      return "Anonymous";
    }
    return r.profiles?.full_name || "Anonymous";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Course Reviews</span>
            {reviewCount > 0 && (
              <div className="flex items-center gap-1.5 text-base font-normal">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviewCount} reviews)</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {/* Write Review Section - matches CommentDialog style */}
          {isAuthenticated && isEnrolled && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Your Rating {!userReview && <span className="text-destructive">*</span>}
                </label>
                <StarRating rating={rating} onChange={setRating} size="lg" />
              </div>

              {/* Review Editor - LightEditor like CommentDialog */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Your Review (optional)
                </label>
                <LightEditor
                  ref={editorRef}
                  value={review}
                  onChange={setReview}
                  placeholder="Share your experience with this course..."
                  characterLimit={2000}
                  draftKey="course_review"
                  minHeight="100px"
                />
              </div>

              {/* Anonymous + Submit Row - exactly like CommentDialog */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="review-anonymous"
                    checked={postAnonymously}
                    onCheckedChange={(checked) => setPostAnonymously(checked as boolean)}
                  />
                  <Label htmlFor="review-anonymous" className="text-sm text-muted-foreground cursor-pointer">
                    Post anonymously (hide my name)
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  {userReview && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={rating === 0 || submitting}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {submitting ? "Submitting..." : userReview ? "Update Review" : "Submit Review"}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {!isAuthenticated && (
            <div className="border rounded-lg p-4 bg-muted/30 text-center">
              <p className="text-muted-foreground">
                Sign in to write a review
              </p>
            </div>
          )}

          {isAuthenticated && !isEnrolled && (
            <div className="border rounded-lg p-4 bg-muted/30 text-center">
              <p className="text-muted-foreground">
                Enroll in this course to write a review
              </p>
            </div>
          )}

          {/* Reviews List */}
          <div className="flex-1 overflow-hidden">
            <h3 className="font-semibold mb-3">All Reviews ({reviewCount})</h3>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No reviews yet. Be the first to review!
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4 pr-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          {!r.is_anonymous && r.profiles?.avatar_url ? (
                            <AvatarImage src={r.profiles.avatar_url} />
                          ) : null}
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {getDisplayName(r)[0]?.toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {getDisplayName(r)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <StarRating rating={r.rating} readonly size="sm" />
                          {r.review && (
                            <div className="text-sm text-muted-foreground mt-2">
                              <RichTextRenderer 
                                content={r.review} 
                                emptyPlaceholder=""
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseReviewDialog;