import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Zap, Target, Crown, Flame, Medal, ChevronRight, Sparkles } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  threshold: number;
  color: string;
  bgColor: string;
}

interface SkillMilestonesProps {
  completedCourses: number;
  readinessPercentage: number;
  compact?: boolean;
  onViewAll?: () => void;
}

const milestones: Milestone[] = [
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Complete your first course',
    icon: <Zap className="h-4 w-4" />,
    threshold: 1,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'on-track',
    title: 'On Track',
    description: 'Complete 3 courses',
    icon: <Target className="h-4 w-4" />,
    threshold: 3,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'rising-star',
    title: 'Rising Star',
    description: 'Reach 25% readiness',
    icon: <Star className="h-4 w-4" />,
    threshold: 25,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    id: 'half-way',
    title: 'Halfway There',
    description: 'Reach 50% readiness',
    icon: <Flame className="h-4 w-4" />,
    threshold: 50,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'achiever',
    title: 'Achiever',
    description: 'Reach 75% readiness',
    icon: <Medal className="h-4 w-4" />,
    threshold: 75,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'master',
    title: 'Career Ready',
    description: 'Reach 100% readiness',
    icon: <Crown className="h-4 w-4" />,
    threshold: 100,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
];

export const SkillMilestones = ({ completedCourses, readinessPercentage, compact = false, onViewAll }: SkillMilestonesProps) => {
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const prevUnlockedRef = useRef<Set<string>>(new Set());

  const isMilestoneUnlocked = (milestone: Milestone): boolean => {
    if (milestone.id === 'first-step') return completedCourses >= 1;
    if (milestone.id === 'on-track') return completedCourses >= 3;
    return readinessPercentage >= milestone.threshold;
  };

  const unlockedMilestones = milestones.filter(m => isMilestoneUnlocked(m));
  const unlockedIds = new Set(unlockedMilestones.map(m => m.id));

  // Detect newly unlocked milestones
  useEffect(() => {
    const newlyUnlocked = [...unlockedIds].find(id => !prevUnlockedRef.current.has(id));
    if (newlyUnlocked && prevUnlockedRef.current.size > 0) {
      setCelebratingId(newlyUnlocked);
      const timer = setTimeout(() => setCelebratingId(null), 2000);
      return () => clearTimeout(timer);
    }
    prevUnlockedRef.current = unlockedIds;
  }, [completedCourses, readinessPercentage]);

  const displayMilestones = compact ? unlockedMilestones.slice(-3) : milestones;

  if (compact && unlockedMilestones.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-border/40 bg-background/50 backdrop-blur-md shadow-md mt-4 group/card">
      {/* Background glow behind card content */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000" />
      
      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shadow-inner">
              <Trophy className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">{compact ? 'Recent Achievements' : 'Readiness Milestones'}</h3>
          </div>
          {compact ? (
            <Button variant="ghost" size="sm" className="hidden sm:flex text-xs font-semibold gap-1 hover:bg-muted/50 rounded-full" onClick={onViewAll}>
              View All Journey <ChevronRight className="h-3 w-3" />
            </Button>
          ) : (
            <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold bg-primary/10 text-primary border-primary/20 shadow-sm">
              {unlockedMilestones.length} / {milestones.length} Unlocked
            </Badge>
          )}
        </div>

        <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'} gap-4 sm:gap-5`}>
          {displayMilestones.map((milestone, index) => {
            const unlocked = isMilestoneUnlocked(milestone);
            const isCelebrating = celebratingId === milestone.id;
            
            return (
              <div
                key={milestone.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`relative group flex flex-col items-center p-5 rounded-[20px] transition-all duration-500 animate-in fade-in-50 zoom-in-95 ${
                  unlocked 
                    ? `bg-background border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-1.5`
                    : 'bg-muted/20 border-border/40 hover:bg-muted/30 hover:border-border/60'
                } ${isCelebrating ? 'animate-bounce' : ''}`}
                title={milestone.description}
              >
                {/* Unlocked background gradient overlay */}
                {unlocked && (
                  <div className={`absolute inset-0 ${milestone.bgColor} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 rounded-[20px]`} />
                )}

                {/* Celebration sparkles */}
                {isCelebrating && (
                  <>
                    <Sparkles className="absolute -top-1 -left-1 h-4 w-4 text-amber-400 animate-ping" />
                    <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 animate-ping" style={{ animationDelay: '0.2s' }} />
                    <Sparkles className="absolute -bottom-1 left-1/2 h-5 w-5 text-amber-400 animate-ping" style={{ animationDelay: '0.4s' }} />
                  </>
                )}
                
                {/* Icon Container with glowing drop shadow */}
                <div className="relative mb-3">
                  {unlocked && (
                    <div className={`absolute inset-0 ${milestone.bgColor} rounded-full blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                  )}
                  <div className={`relative p-3.5 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    unlocked 
                      ? `${milestone.bgColor} border-transparent shadow-sm group-hover:scale-110` 
                      : 'bg-muted/50 border-transparent opacity-60 filter grayscale'
                  } ${isCelebrating ? 'ring-4 ring-amber-400/50 ring-offset-2 scale-125' : ''}`}>
                    <span className={`transition-colors duration-500 ${unlocked ? milestone.color : 'text-muted-foreground'}`}>
                      {milestone.icon}
                    </span>
                  </div>
                </div>

                {/* Title & Tooltip info */}
                <div className="text-center">
                  <span className={`block font-bold text-[13px] sm:text-sm tracking-tight transition-colors duration-500 ${unlocked ? 'text-foreground group-hover:text-primary' : 'text-muted-foreground'}`}>
                    {milestone.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute bottom-1.5 left-0 right-0 text-center">
                    {unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
