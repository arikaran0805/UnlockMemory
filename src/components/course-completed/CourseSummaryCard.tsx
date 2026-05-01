/**
 * CourseSummaryCard - Course completion statistics
 * 
 * Displays summary of completed lessons, time spent, and skills covered.
 */

import { Card } from "@/components/ui/card";
import { BookOpen, Clock, Target, CheckCircle2 } from "lucide-react";

interface CourseSummaryCardProps {
  lessonsCompleted: number;
  totalHours: number;
  skills: string[];
}

const CourseSummaryCard = ({
  lessonsCompleted,
  totalHours,
  skills,
}: CourseSummaryCardProps) => {
  const formatHours = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    if (hours === 1) return '1 hour';
    return `${hours.toFixed(1)} hours`;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Course Summary</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Lessons Completed */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{lessonsCompleted}</p>
            <p className="text-sm text-muted-foreground">Lessons Completed</p>
          </div>
        </div>

        {/* Total Hours */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
            <p className="text-sm text-muted-foreground">Time Invested</p>
          </div>
        </div>

        {/* Skills Covered */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{skills.length}</p>
            <p className="text-sm text-muted-foreground">
              {skills.length === 1 ? 'Core Skill' : 'Skills Covered'}
            </p>
          </div>
        </div>
      </div>

      {/* Skills List */}
      {skills.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">Key Skills You've Learned</p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <div 
                key={index}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-foreground/70 text-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{skill}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default CourseSummaryCard;
