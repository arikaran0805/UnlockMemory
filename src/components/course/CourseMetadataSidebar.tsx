import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Clock,
  Globe,
  Calendar,
  Award,
  Copy,
  Check,
  Edit2,
  Info,
  BookOpen,
  User,
  Users,
  ExternalLink,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface Career {
  id: string;
  name: string;
  slug: string;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface LinkedPrerequisite {
  id: string;
  prerequisite_course_id: string | null;
  prerequisite_text: string | null;
  linkedCourse?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  isCompleted?: boolean;
  progressPercentage?: number;
}

interface CourseMetadataSidebarProps {
  course: {
    id: string;
    name: string;
    slug: string;
    level?: string | null;
    learning_hours?: number | null;
    created_at?: string;
    updated_at?: string | null;
  };
  careers: Career[];
  estimatedDuration: string;
  lastUpdated?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  onEdit?: () => void;
  linkedPrerequisites?: LinkedPrerequisite[];
  creator?: TeamMember | null;
  maintenanceTeam?: TeamMember[];
}

// ── Shared card shell ──────────────────────────────────────────────────────────
const SideCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "rounded-xl border border-border/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_8px_rgba(0,0,0,0.04)]",
    className
  )}>
    {children}
  </div>
);

// ── Section header inside a card ───────────────────────────────────────────────
const SideCardHeader = ({
  icon: Icon,
  title,
  action,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/50">
    <Icon className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
    <span className="text-[12px] font-semibold text-foreground/80 tracking-[0.02em] uppercase flex-1">
      {title}
    </span>
    {badge}
    {action}
  </div>
);

// ── Info row ───────────────────────────────────────────────────────────────────
const InfoRow = ({
  icon: Icon,
  label,
  value,
  valueComponent,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  valueComponent?: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
    <Icon className="h-[14px] w-[14px] text-muted-foreground/50 flex-shrink-0" />
    <span className="text-[13px] text-muted-foreground flex-1">{label}</span>
    {valueComponent || (
      <span className="text-[13px] font-medium text-foreground text-right">
        {value}
      </span>
    )}
  </div>
);

// ── Team member row ────────────────────────────────────────────────────────────
const TeamMemberRow = ({ member }: { member: TeamMember }) => (
  <div className="flex items-center gap-2.5 py-1">
    <Avatar className="h-7 w-7 border border-border/40 flex-shrink-0">
      <AvatarImage src={member.avatar_url || undefined} />
      <AvatarFallback className="bg-muted text-muted-foreground text-[11px] font-medium">
        {member.full_name?.charAt(0)?.toUpperCase() || "U"}
      </AvatarFallback>
    </Avatar>
    <span className="text-[13px] font-medium text-foreground truncate">
      {member.full_name || "Unknown"}
    </span>
  </div>
);

export function CourseMetadataSidebar({
  course,
  careers,
  estimatedDuration,
  lastUpdated,
  isAdmin = false,
  isModerator = false,
  isHeaderVisible,
  showAnnouncement,
  onEdit,
  linkedPrerequisites = [],
  creator,
  maintenanceTeam = [],
}: CourseMetadataSidebarProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyUrl = async () => {
    const url = `${window.location.origin}/course/${course.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: "URL copied!", description: "Course URL copied to clipboard." });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const stickyTopClass = isHeaderVisible
    ? showAnnouncement ? "top-[8.75rem]" : "top-[6.5rem]"
    : showAnnouncement ? "top-[4.75rem]" : "top-10";

  const canEdit = isAdmin || isModerator;

  return (
    <aside className="hidden xl:block w-[272px] flex-shrink-0">
      <div className={cn("sticky transition-[top] duration-200 ease-out", stickyTopClass)}>
        <div className="space-y-3 pl-3 pr-1 pb-6">

          {/* ── Course Info ───────────────────────────────────────────── */}
          <SideCard>
            <SideCardHeader
              icon={Info}
              title="Course Info"
              action={
                canEdit && onEdit ? (
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={onEdit}>
                    <Edit2 className="h-3 w-3 text-muted-foreground/60" />
                  </Button>
                ) : undefined
              }
            />
            <div className="px-4 py-1">
              <InfoRow icon={TrendingUp} label="Level"    value={course.level || "Beginner"} />
              <InfoRow icon={Clock}      label="Duration" value={course.learning_hours ? `${course.learning_hours} hours` : estimatedDuration} />
              <InfoRow icon={Globe}      label="Language" value="English" />
              <InfoRow icon={Calendar}   label="Updated"  value={lastUpdated || formatDate(course.updated_at || course.created_at || new Date().toISOString())} />
            </div>

            {/* Career Paths */}
            <div className="px-4 pt-3 pb-1 border-t border-border/40">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Award className="h-[14px] w-[14px] text-muted-foreground/50" />
                <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.07em]">
                  Career Path(s)
                </span>
              </div>
              {careers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {careers.map((career) => (
                    <Link key={career.id} to={`/career/${career.slug}`}>
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-medium px-2 py-0.5 bg-muted/60 text-foreground/70 border border-border/40 hover:bg-muted hover:text-foreground transition-colors cursor-pointer rounded-md"
                      >
                        {career.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground/60 pb-1">No career path assigned</p>
              )}
            </div>

            {/* Course URL */}
            <div className="px-4 pt-3 pb-4 border-t border-border/40">
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.07em] mb-2">
                Course URL
              </p>
              <div className="flex items-center gap-2">
                <code className="text-[12px] bg-muted/50 border border-border/40 px-2.5 py-1.5 rounded-md truncate flex-1 text-foreground/70 font-mono">
                  /course/{course.slug}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 hover:bg-muted/70 rounded-md"
                  onClick={copyUrl}
                >
                  {copiedUrl
                    ? <Check className="h-3.5 w-3.5 text-foreground/60" />
                    : <Copy className="h-3.5 w-3.5 text-muted-foreground/60" />
                  }
                </Button>
              </div>
            </div>
          </SideCard>

          {/* ── Prerequisites ─────────────────────────────────────────── */}
          <SideCard>
            <SideCardHeader
              icon={BookOpen}
              title="Prerequisites"
              badge={
                linkedPrerequisites.length > 0 ? (
                  <span className="text-[10px] font-semibold text-muted-foreground/60 tabular-nums">
                    {linkedPrerequisites.filter(p => p.isCompleted).length}/{linkedPrerequisites.length}
                  </span>
                ) : undefined
              }
            />
            <div className="px-4 py-3">
              {linkedPrerequisites.length > 0 ? (
                <ul className="space-y-2.5">
                  {linkedPrerequisites.map((prereq) => (
                    <li key={prereq.id} className="text-[13px] flex items-start gap-2">
                      {prereq.linkedCourse ? (
                        prereq.isCompleted
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-foreground/50 flex-shrink-0 mt-0.5" />
                          : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                      ) : (
                        <span className="text-muted-foreground/50 mt-0.5 w-3.5 text-center flex-shrink-0 text-[10px]">•</span>
                      )}
                      <div className="flex-1 min-w-0">
                        {prereq.linkedCourse ? (
                          <div className="flex flex-col gap-1">
                            <Link
                              to={`/course/${prereq.linkedCourse.slug}`}
                              className={cn(
                                "hover:underline flex items-center gap-1 group text-foreground/80",
                                prereq.isCompleted && "line-through opacity-50"
                              )}
                            >
                              <span className="truncate">{prereq.linkedCourse.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                            </Link>
                            {prereq.progressPercentage !== undefined && prereq.progressPercentage > 0 && !prereq.isCompleted && (
                              <div className="flex items-center gap-1.5">
                                <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${prereq.progressPercentage}%`, background: "hsl(152 36% 33%)" }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                                  {prereq.progressPercentage}%
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70">{prereq.prerequisite_text}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground/60">No prerequisites required</p>
              )}
            </div>
          </SideCard>

          {/* ── Team ──────────────────────────────────────────────────── */}
          <SideCard>
            <SideCardHeader icon={Users} title="Team" />
            <div className="px-4 py-3 space-y-4">

              {/* Created by */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 mb-2">
                  Created by
                </p>
                {creator ? (
                  <TeamMemberRow member={creator} />
                ) : (
                  <div className="flex items-center gap-2.5 py-1">
                    <div className="h-7 w-7 rounded-full bg-muted border border-border/40 flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                    <span className="text-[13px] text-muted-foreground/70">Platform Team</span>
                  </div>
                )}
              </div>

              {/* Maintained by */}
              <div className="border-t border-border/40 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 mb-2">
                  Maintained by
                </p>
                {maintenanceTeam.length > 0 ? (
                  <div className="space-y-0.5">
                    {maintenanceTeam.slice(0, 3).map((member) => (
                      <TeamMemberRow key={member.id} member={member} />
                    ))}
                    {maintenanceTeam.length > 3 && (
                      <p className="text-[11px] text-muted-foreground/50 pl-9 pt-0.5">
                        +{maintenanceTeam.length - 3} more
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 py-1">
                    <div className="h-7 w-7 rounded-full bg-muted border border-border/40 flex items-center justify-center flex-shrink-0">
                      <Users className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                    <span className="text-[13px] text-muted-foreground/70">Platform Team</span>
                  </div>
                )}
              </div>

            </div>
          </SideCard>

        </div>
      </div>
    </aside>
  );
}

export default CourseMetadataSidebar;
