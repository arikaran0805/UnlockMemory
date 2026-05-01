/**
 * NextStepsCard - Guide learner to next actions
 * 
 * Primary: Explore next course
 * Secondary: View all courses, go to dashboard
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, LayoutDashboard, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface RecommendedCourse {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  /** Override link path (for career board context) */
  linkOverride?: string;
}

interface NextStepsCardProps {
  recommendedCourse?: RecommendedCourse;
}

const NextStepsCard = ({ recommendedCourse }: NextStepsCardProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        What's Next?
      </h3>

      <div className="space-y-4">
        {/* Primary CTA - Next Course */}
        {recommendedCourse ? (
          <Link to={recommendedCourse.linkOverride || `/course/${recommendedCourse.slug}`}>
            <div className="group p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-primary font-medium mb-1">
                    Recommended Next
                  </p>
                  <p className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {recommendedCourse.name}
                  </p>
                  {/* Confidence tag */}
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                    Recommended Next Step
                  </span>
                  {recommendedCourse.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {recommendedCourse.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ) : (
          <Link to="/courses">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              <BookOpen className="h-4 w-4" />
              Explore More Courses
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}

        {/* Secondary Actions - Dashboard has slightly more prominence */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <Button variant="outline" asChild>
            <Link to="/courses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              View All Courses
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="font-medium">
            <Link to="/profile" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NextStepsCard;
