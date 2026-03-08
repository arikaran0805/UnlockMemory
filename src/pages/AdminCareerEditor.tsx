import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Save, X, BookOpen, Sparkles, MousePointerClick,
  GripVertical, Trash2, Settings, Palette, ChevronRight, ChevronLeft, Search,
  Target, TrendingUp, Zap, Move, Send
} from "lucide-react";
import * as Icons from "lucide-react";

import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Types
interface SkillNode {
  id: string;
  name: string;
  weight: number;
  icon: string;
  color: string;
  x: number;
  y: number;
  courses: { courseId: string; contribution: number }[];
}

interface SkillContribution {
  skill_name: string;
  contribution: number;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

// Sortable Skill Item Component
interface SortableSkillItemProps {
  skill: SkillNode;
  colorStyle: {
    name: string;
    bg: string;
    border: string;
    text: string;
    ring: string;
  };
  getIcon: (iconName: string) => React.ReactNode;
}

const SortableSkillItem = ({ skill, colorStyle, getIcon }: SortableSkillItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: skill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasCourses = skill.courses.length > 0;
  const avgContribution = skill.courses.length > 0 
    ? Math.round(skill.courses.reduce((sum, c) => sum + c.contribution, 0) / skill.courses.length)
    : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg border ${colorStyle.bg} ${colorStyle.border} ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      } transition-all`}
    >
      <div className="flex items-center gap-2 mb-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-background/50 rounded transition-colors"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className={`p-1 rounded ${colorStyle.text}`}>
          {getIcon(skill.icon)}
        </div>
        <span className={`font-medium text-sm ${colorStyle.text}`}>{skill.name}</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {skill.weight}%
        </Badge>
      </div>
      
      <Progress 
        value={hasCourses ? avgContribution : 0} 
        className="h-1.5 mb-2" 
      />
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{skill.courses.length} course(s)</span>
        {hasCourses && <span>Avg: {avgContribution}%</span>}
      </div>
    </div>
  );
};

interface Course {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}
const skillIconOptions = [
  "Code2", "Database", "BarChart3", "Brain", "Cpu", "Terminal",
  "Server", "Cloud", "Layers", "Zap", "Target", "Rocket"
];

const skillColorOptions = [
  { name: "Emerald", bg: "bg-emerald-500/20", solid: "bg-emerald-500", border: "border-emerald-500/50", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/30" },
  { name: "Blue", bg: "bg-blue-500/20", solid: "bg-blue-500", border: "border-blue-500/50", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/30" },
  { name: "Purple", bg: "bg-purple-500/20", solid: "bg-purple-500", border: "border-purple-500/50", text: "text-purple-600 dark:text-purple-400", ring: "ring-purple-500/30" },
  { name: "Orange", bg: "bg-orange-500/20", solid: "bg-orange-500", border: "border-orange-500/50", text: "text-orange-600 dark:text-orange-400", ring: "ring-orange-500/30" },
  { name: "Pink", bg: "bg-pink-500/20", solid: "bg-pink-500", border: "border-pink-500/50", text: "text-pink-600 dark:text-pink-400", ring: "ring-pink-500/30" },
  { name: "Teal", bg: "bg-teal-500/20", solid: "bg-teal-500", border: "border-teal-500/50", text: "text-teal-600 dark:text-teal-400", ring: "ring-teal-500/30" },
  { name: "Rose", bg: "bg-rose-500/20", solid: "bg-rose-500", border: "border-rose-500/50", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/30" },
  { name: "Sky", bg: "bg-sky-500/20", solid: "bg-sky-500", border: "border-sky-500/50", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/30" },
];

const careerColorOptions = [
  { label: "Purple", value: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  { label: "Blue", value: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { label: "Orange", value: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
  { label: "Green", value: "bg-green-500/10 text-green-500 border-green-500/30" },
  { label: "Pink", value: "bg-pink-500/10 text-pink-500 border-pink-500/30" },
  { label: "Teal", value: "bg-teal-500/10 text-teal-500 border-teal-500/30" },
];

const careerIconOptions = [
  "Brain", "Database", "Layers", "BarChart3", "Code2", "Briefcase", 
  "Server", "Cloud", "Cpu", "Terminal", "Rocket", "Target"
];

const AdminCareerEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, userId, isLoading: roleLoading } = useUserRole();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [activeTab, setActiveTab] = useState("settings");
  
  // Career form state
  const [careerName, setCareerName] = useState("");
  const [careerSlug, setCareerSlug] = useState("");
  const [careerDescription, setCareerDescription] = useState("");
  const [careerIcon, setCareerIcon] = useState("Briefcase");
  const [careerColor, setCareerColor] = useState(careerColorOptions[0].value);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [careerStatus, setCareerStatus] = useState("draft");
  const [originalAuthorId, setOriginalAuthorId] = useState<string | null>(null);
  
  // Canvas state
  const [skillNodes, setSkillNodes] = useState<SkillNode[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [draggingSkill, setDraggingSkill] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Course drag state
  const [draggingCourse, setDraggingCourse] = useState<string | null>(null);
  const [dropTargetSkill, setDropTargetSkill] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Course library sidebar
  
  // Dialogs
  const [skillEditorOpen, setSkillEditorOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillNode | null>(null);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [pendingCourseMapping, setPendingCourseMapping] = useState<{
    skillId: string;
    courseId: string;
  } | null>(null);
  
  // Multi-course add state
  const [addCoursesDialogOpen, setAddCoursesDialogOpen] = useState(false);
  const [addCoursesSkillId, setAddCoursesSkillId] = useState<string | null>(null);
  const [selectedCoursesToAdd, setSelectedCoursesToAdd] = useState<{courseId: string; contribution: number}[]>([]);
  const [contributionValue, setContributionValue] = useState(50);
  const [sharedContribution, setSharedContribution] = useState(50);
  const [useSharedContribution, setUseSharedContribution] = useState(true);
  
  // Track if user has attempted to save (for validation display)
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  // DnD sensors for skill reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSkillDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSkillNodes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Initialize
  useEffect(() => {
    if (!roleLoading) {
      checkAccess();
    }
  }, [roleLoading]);

  useEffect(() => {
    if (isAdmin || isModerator) {
      fetchCourses();
      if (id) {
        fetchCareer(id);
      } else {
        fetchCareersCount();
      }
    }
  }, [id, isAdmin, isModerator]);

  const checkAccess = async () => {
    if (!isAdmin && !isModerator) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug, description")
        .order("name");
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchCareersCount = async () => {
    try {
      const { count } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true });
      setDisplayOrder((count || 0) + 1);
    } catch (error) {
      console.error("Error fetching careers count:", error);
    }
  };

  const fetchCareer = async (careerId: string) => {
    try {
      setLoading(true);
      const [careerRes, skillsRes, coursesRes] = await Promise.all([
        supabase.from("careers").select("*").eq("id", careerId).single(),
        supabase.from("career_skills").select("*").eq("career_id", careerId).order("display_order"),
        supabase.from("career_courses").select("*, course:course_id(id, name, slug)").eq("career_id", careerId),
      ]);

      if (careerRes.error) throw careerRes.error;

      const career = careerRes.data;

      // Check if moderator is trying to edit someone else's career
      if (isModerator && !isAdmin && career.author_id && career.author_id !== userId) {
        toast({
          title: "Access Denied",
          description: "You can only edit your own careers",
          variant: "destructive",
        });
        navigate("/admin/careers");
        return;
      }

      setOriginalAuthorId(career.author_id);
      setCareerName(career.name);
      setCareerSlug(career.slug);
      setCareerDescription(career.description || "");
      setCareerIcon(career.icon);
      setCareerColor(career.color);
      setDisplayOrder(career.display_order);
      setCareerStatus(career.status || "draft");

      // Convert skills to nodes with positions
      const nodes: SkillNode[] = (skillsRes.data || []).map((skill, index) => {
        // Find courses mapped to this skill
        const mappedCourses: { courseId: string; contribution: number }[] = [];
        (coursesRes.data || []).forEach(cc => {
          const contributions = Array.isArray(cc.skill_contributions) 
            ? (cc.skill_contributions as unknown as SkillContribution[])
            : [];
          const contribution = contributions.find(c => c.skill_name === skill.skill_name);
          if (contribution) {
            mappedCourses.push({ courseId: cc.course_id, contribution: contribution.contribution });
          }
        });

        return {
          id: skill.id,
          name: skill.skill_name,
          weight: skill.weight || 25,
          icon: skill.icon || "Code2",
          color: skill.color || skillColorOptions[index % skillColorOptions.length].name,
          x: 100 + (index % 3) * 280,
          y: 100 + Math.floor(index / 3) * 180,
          courses: mappedCourses,
        };
      });

      setSkillNodes(nodes);
    } catch (error: any) {
      toast({ title: "Error loading career", variant: "destructive" });
      navigate("/admin/courses?tab=careers");
    } finally {
      setLoading(false);
    }
  };

  // Slug generation
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  // Canvas interactions
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.skill-node')) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSkill: SkillNode = {
      id: `skill-${Date.now()}`,
      name: "New Skill",
      weight: 25,
      icon: skillIconOptions[skillNodes.length % skillIconOptions.length],
      color: skillColorOptions[skillNodes.length % skillColorOptions.length].name,
      x: Math.max(20, Math.min(x - 100, rect.width - 220)),
      y: Math.max(20, Math.min(y - 40, rect.height - 100)),
      courses: [],
    };

    setSkillNodes(prev => [...prev, newSkill]);
    setEditingSkill(newSkill);
    setSkillEditorOpen(true);
  };

  const handleSkillMouseDown = (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation();
    const skill = skillNodes.find(s => s.id === skillId);
    if (!skill) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggingSkill(skillId);
    setSelectedSkill(skillId);
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingSkill || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setSkillNodes(prev => prev.map(s => 
      s.id === draggingSkill 
        ? { ...s, x: Math.max(0, Math.min(x, rect.width - 200)), y: Math.max(0, Math.min(y, rect.height - 80)) }
        : s
    ));
  }, [draggingSkill, dragOffset]);

  const handleCanvasMouseUp = () => {
    setDraggingSkill(null);
  };

  // Course drag handlers
  const handleCourseDragStart = (e: React.DragEvent, courseId: string) => {
    e.dataTransfer.setData("courseId", courseId);
    setDraggingCourse(courseId);
  };

  const handleCourseDragEnd = () => {
    setDraggingCourse(null);
    setDropTargetSkill(null);
  };

  const handleSkillDragOver = (e: React.DragEvent, skillId: string) => {
    e.preventDefault();
    setDropTargetSkill(skillId);
  };

  const handleSkillDragLeave = () => {
    setDropTargetSkill(null);
  };

  const handleSkillDrop = (e: React.DragEvent, skillId: string) => {
    e.preventDefault();
    const courseId = e.dataTransfer.getData("courseId");
    if (!courseId) return;

    // Check if course is already mapped to this skill
    const skill = skillNodes.find(s => s.id === skillId);
    if (skill?.courses.some(c => c.courseId === courseId)) {
      toast({ title: "Course already mapped to this skill" });
      setDropTargetSkill(null);
      setDraggingCourse(null);
      return;
    }

    // Open contribution dialog
    setPendingCourseMapping({ skillId, courseId });
    setContributionValue(50);
    setContributionDialogOpen(true);
    setDropTargetSkill(null);
    setDraggingCourse(null);
  };

  const confirmCourseMapping = () => {
    if (!pendingCourseMapping) return;

    setSkillNodes(prev => prev.map(skill => {
      if (skill.id === pendingCourseMapping.skillId) {
        return {
          ...skill,
          courses: [...skill.courses, { 
            courseId: pendingCourseMapping.courseId, 
            contribution: contributionValue 
          }],
        };
      }
      return skill;
    }));

    setContributionDialogOpen(false);
    setPendingCourseMapping(null);
    toast({ title: "Course mapped successfully!" });
  };

  // Multi-course add functions
  const openAddCoursesDialog = (skillId: string) => {
    setAddCoursesSkillId(skillId);
    setSelectedCoursesToAdd([]);
    setSharedContribution(50);
    setUseSharedContribution(true);
    setAddCoursesDialogOpen(true);
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCoursesToAdd(prev => {
      const exists = prev.find(c => c.courseId === courseId);
      if (exists) {
        return prev.filter(c => c.courseId !== courseId);
      }
      return [...prev, { courseId, contribution: useSharedContribution ? sharedContribution : 50 }];
    });
  };

  const applySharedContributionToAll = () => {
    setSelectedCoursesToAdd(prev => prev.map(c => ({ ...c, contribution: sharedContribution })));
  };

  const updateSelectedCourseContribution = (courseId: string, contribution: number) => {
    setSelectedCoursesToAdd(prev => prev.map(c => 
      c.courseId === courseId ? { ...c, contribution } : c
    ));
  };

  const confirmAddMultipleCourses = () => {
    if (!addCoursesSkillId || selectedCoursesToAdd.length === 0) return;

    setSkillNodes(prev => prev.map(skill => {
      if (skill.id === addCoursesSkillId) {
        const existingCourseIds = skill.courses.map(c => c.courseId);
        const newCourses = selectedCoursesToAdd.filter(c => !existingCourseIds.includes(c.courseId));
        return {
          ...skill,
          courses: [...skill.courses, ...newCourses],
        };
      }
      return skill;
    }));

    // Update editingSkill if it's the same
    if (editingSkill?.id === addCoursesSkillId) {
      const skill = skillNodes.find(s => s.id === addCoursesSkillId);
      if (skill) {
        const existingCourseIds = skill.courses.map(c => c.courseId);
        const newCourses = selectedCoursesToAdd.filter(c => !existingCourseIds.includes(c.courseId));
        setEditingSkill({
          ...skill,
          courses: [...skill.courses, ...newCourses],
        });
      }
    }

    setAddCoursesDialogOpen(false);
    setAddCoursesSkillId(null);
    setSelectedCoursesToAdd([]);
    toast({ title: `${selectedCoursesToAdd.length} course(s) added successfully!` });
  };

  const removeCourseFromSkill = (skillId: string, courseId: string) => {
    setSkillNodes(prev => prev.map(skill => {
      if (skill.id === skillId) {
        return {
          ...skill,
          courses: skill.courses.filter(c => c.courseId !== courseId),
        };
      }
      return skill;
    }));
  };

  const updateCourseContribution = (skillId: string, courseId: string, contribution: number) => {
    setSkillNodes(prev => prev.map(skill => {
      if (skill.id === skillId) {
        return {
          ...skill,
          courses: skill.courses.map(c => 
            c.courseId === courseId ? { ...c, contribution } : c
          ),
        };
      }
      return skill;
    }));
  };

  // Skill management
  const deleteSkill = (skillId: string) => {
    setSkillNodes(prev => prev.filter(s => s.id !== skillId));
    setSelectedSkill(null);
    setSkillEditorOpen(false);
  };

  const updateSkill = (updates: Partial<SkillNode>) => {
    if (!editingSkill) return;
    setSkillNodes(prev => prev.map(s => 
      s.id === editingSkill.id ? { ...s, ...updates } : s
    ));
    setEditingSkill(prev => prev ? { ...prev, ...updates } : null);
  };

  const autoBalanceWeights = () => {
    if (skillNodes.length === 0) return;
    const equalWeight = Math.floor(100 / skillNodes.length);
    const remainder = 100 - (equalWeight * skillNodes.length);
    setSkillNodes(prev => prev.map((skill, index) => ({
      ...skill,
      weight: equalWeight + (index < remainder ? 1 : 0),
    })));
  };

  // Calculations
  const getTotalWeight = () => skillNodes.reduce((sum, s) => sum + s.weight, 0);
  
  const getSkillColor = (colorName: string) => 
    skillColorOptions.find(c => c.name === colorName) || skillColorOptions[0];

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Icons.Code2 className="h-5 w-5" />;
  };

  // Chart configuration for radar
  const chartConfig: ChartConfig = {
    value: {
      label: "Weight",
      color: "hsl(var(--primary))",
    },
  };

  // Generate radar chart data from skill nodes
  const getSkillRadarData = () => {
    if (skillNodes.length === 0) return [];
    return skillNodes.map(skill => ({
      skill: skill.name,
      value: skill.weight,
      fullMark: 100,
    }));
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const getMappedCourseIds = () => {
    const ids = new Set<string>();
    skillNodes.forEach(skill => {
      skill.courses.forEach(c => ids.add(c.courseId));
    });
    return ids;
  };

  // Validation
  const getValidationErrors = () => {
    const errors: string[] = [];
    
    if (!careerName.trim()) {
      errors.push("Career name is required");
    }
    if (!careerSlug.trim()) {
      errors.push("Career slug is required");
    }
    if (skillNodes.length > 0 && getTotalWeight() !== 100) {
      errors.push(`Skill weights must total 100% (currently ${getTotalWeight()}%)`);
    }
    const skillsWithoutCourses = skillNodes.filter(s => s.courses.length === 0);
    if (skillsWithoutCourses.length > 0) {
      errors.push(`${skillsWithoutCourses.length} skill(s) have no courses mapped: ${skillsWithoutCourses.map(s => s.name).join(", ")}`);
    }
    
    return errors;
  };

  const isValid = () => getValidationErrors().length === 0;

  // Save
  const handleSubmit = async () => {
    // Mark that user has attempted to save
    setHasAttemptedSave(true);
    
    try {
      const errors = getValidationErrors();
      
      if (errors.length > 0) {
        toast({ 
          title: "Cannot save career", 
          description: errors[0],
          variant: "destructive" 
        });
        return;
      }
      
      setLoading(true);

      // Build course skill mappings
      const courseSkillMappings: Record<string, SkillContribution[]> = {};
      skillNodes.forEach(skill => {
        skill.courses.forEach(({ courseId, contribution }) => {
          if (!courseSkillMappings[courseId]) {
            courseSkillMappings[courseId] = [];
          }
          courseSkillMappings[courseId].push({
            skill_name: skill.name,
            contribution,
          });
        });
      });

      const courseIds = Object.keys(courseSkillMappings);

      if (id) {
        // Update career
        const { error } = await supabase
          .from("careers")
          .update({
            name: careerName,
            slug: careerSlug,
            description: careerDescription || null,
            icon: careerIcon,
            color: careerColor,
            display_order: displayOrder,
          })
          .eq("id", id);

        if (error) throw error;

        // Update skills
        await supabase.from("career_skills").delete().eq("career_id", id);
        if (skillNodes.length > 0) {
          const skillsToInsert = skillNodes.map((skill, idx) => ({
            career_id: id,
            skill_name: skill.name,
            display_order: idx + 1,
            weight: skill.weight,
            icon: skill.icon,
            color: skill.color,
          }));
          await supabase.from("career_skills").insert(skillsToInsert);
        }

        // Update courses
        await supabase.from("career_courses").delete().eq("career_id", id);
        if (courseIds.length > 0) {
          const coursesToInsert = courseIds.map(courseId => ({
            career_id: id,
            course_id: courseId,
            skill_contributions: courseSkillMappings[courseId] as unknown as Json,
          }));
          await supabase.from("career_courses").insert(coursesToInsert);
        }

        toast({ title: "Career updated successfully" });
      } else {
        // Create career
        const { data: newCareer, error } = await supabase
          .from("careers")
          .insert({
            name: careerName,
            slug: careerSlug,
            description: careerDescription || null,
            icon: careerIcon,
            color: careerColor,
            display_order: displayOrder,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert skills
        if (skillNodes.length > 0) {
          const skillsToInsert = skillNodes.map((skill, idx) => ({
            career_id: newCareer.id,
            skill_name: skill.name,
            display_order: idx + 1,
            weight: skill.weight,
            icon: skill.icon,
            color: skill.color,
          }));
          await supabase.from("career_skills").insert(skillsToInsert);
        }

        // Insert courses
        if (courseIds.length > 0) {
          const coursesToInsert = courseIds.map(courseId => ({
            career_id: newCareer.id,
            course_id: courseId,
            skill_contributions: courseSkillMappings[courseId] as unknown as Json,
          }));
          await supabase.from("career_courses").insert(coursesToInsert);
        }

        toast({ title: "Career created successfully" });
      }

      navigate("/admin/careers");
    } catch (error: any) {
      toast({ title: "Error saving career", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Loading career...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Header with Tabs inline */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/careers")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${careerColor}`}>
                {getIcon(careerIcon)}
              </div>
              <div>
                <h1 className="text-lg font-bold">{careerName || "New Career"}</h1>
                <p className="text-xs text-muted-foreground">
                  {skillNodes.length} skills · {getMappedCourseIds().size} courses
                </p>
              </div>
            </div>
            
            {/* Tabs inline with career name */}
            <div className="ml-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-9">
                  <TabsTrigger value="settings" className="text-xs px-3">
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    Settings
                  </TabsTrigger>
                  <TabsTrigger value="canvas" className="text-xs px-3">
                    <Target className="h-3.5 w-3.5 mr-1.5" />
                    Skill Canvas
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs px-3">
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasAttemptedSave && !isValid() && (
              <Badge variant="destructive" className="text-xs">
                <Icons.AlertTriangle className="h-3 w-3 mr-1" />
                {getValidationErrors().length} issue(s)
              </Badge>
            )}
            <Button variant="outline" className="w-[136px]" onClick={() => navigate("/admin/careers")}>
              Cancel
            </Button>
            <Button 
              className="w-[136px]" 
              onClick={handleSubmit} 
              disabled={loading}
              variant={(hasAttemptedSave && !isValid()) ? "outline" : "default"}
            >
              <Save className="h-4 w-4 mr-2" />
              {id ? "Update" : "Create"}
            </Button>
          </div>
        </div>

        {/* Main Content with Right Sidebar */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left - Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsContent value="canvas" className="flex-1 data-[state=active]:flex data-[state=active]:flex-col">
                <div 
                  ref={canvasRef}
                  className="relative w-full flex-1 min-h-[400px] bg-muted/30 rounded-xl border-2 border-dashed border-border overflow-hidden cursor-crosshair"
                  onDoubleClick={handleCanvasDoubleClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                >
                  {/* Weights badge - top right of canvas */}
                  {skillNodes.length > 0 && (
                    <div className="absolute top-3 right-3 z-20">
                      <Badge variant={getTotalWeight() === 100 ? "default" : "destructive"} className="text-sm px-3 py-1">
                        Weights: {getTotalWeight()}%
                      </Badge>
                    </div>
                  )}

                  {/* Canvas hint */}
                  {skillNodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center text-muted-foreground">
                        <MousePointerClick className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">Double-click to create a skill</p>
                        <p className="text-sm">Drag courses from the right panel onto skills</p>
                      </div>
                    </div>
                  )}

                  {/* Skill Nodes */}
                  {skillNodes.map(skill => {
                    const colorStyle = getSkillColor(skill.color);
                    const isSelected = selectedSkill === skill.id;
                    const isDropTarget = dropTargetSkill === skill.id;
                    
                    return (
                      <div
                        key={skill.id}
                        className={`skill-node absolute select-none transition-shadow ${
                          isDropTarget ? 'ring-4 ' + colorStyle.ring : ''
                        } ${isSelected ? 'z-10' : 'z-0'}`}
                        style={{ left: skill.x, top: skill.y }}
                        onMouseDown={(e) => handleSkillMouseDown(e, skill.id)}
                        onDragOver={(e) => handleSkillDragOver(e, skill.id)}
                        onDragLeave={handleSkillDragLeave}
                        onDrop={(e) => handleSkillDrop(e, skill.id)}
                      >
                        <div className={`
                          w-52 rounded-xl border-2 backdrop-blur-sm cursor-move
                          ${colorStyle.bg} ${colorStyle.border}
                          ${isSelected ? 'shadow-lg' : 'shadow-md hover:shadow-lg'}
                          transition-all duration-200
                        `}>
                          {/* Skill Header */}
                          <div className="p-3 border-b border-inherit/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${colorStyle.bg} ${colorStyle.text}`}>
                                  {getIcon(skill.icon)}
                                </div>
                                <div>
                                  <p className={`font-semibold text-sm ${colorStyle.text}`}>
                                    {skill.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Weight: {skill.weight}%
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSkill(skill);
                                  setSkillEditorOpen(true);
                                }}
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Mapped Courses */}
                          <div className="p-2 space-y-1 max-h-32 overflow-y-auto">
                            {skill.courses.length === 0 ? (
                              <div className={`text-xs text-center py-3 ${colorStyle.text} opacity-60`}>
                                Drop courses here
                              </div>
                            ) : (
                              skill.courses.map(({ courseId, contribution }) => {
                                const course = courses.find(c => c.id === courseId);
                                return (
                                  <div 
                                    key={courseId}
                                    className="flex items-center gap-1.5 p-1.5 rounded-lg bg-background/60 group"
                                  >
                                    <BookOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs truncate flex-1">
                                      {course?.name || "Unknown"}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                      {contribution}%
                                    </Badge>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeCourseFromSkill(skill.id, courseId);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-auto">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Career Summary Card */}
                  <Card className="p-5 bg-gradient-to-br from-card to-muted/30 border-2">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2.5 rounded-xl ${careerColor}`}>
                        {getIcon(careerIcon)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{careerName || "Career Name"}</h3>
                        <p className="text-sm text-muted-foreground">{careerDescription || "No description yet"}</p>
                      </div>
                    </div>
                    
                    {/* Configuration Checklist */}
                    <div className="space-y-3 mb-4">
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${careerName ? 'bg-green-500/10' : 'bg-muted'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${careerName ? 'bg-green-500 text-white' : 'bg-muted-foreground/30'}`}>
                          {careerName ? <Icons.Check className="h-3 w-3" /> : <span className="text-xs">1</span>}
                        </div>
                        <span className="text-sm">Career name & slug set</span>
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${skillNodes.length > 0 ? 'bg-green-500/10' : 'bg-muted'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${skillNodes.length > 0 ? 'bg-green-500 text-white' : 'bg-muted-foreground/30'}`}>
                          {skillNodes.length > 0 ? <Icons.Check className="h-3 w-3" /> : <span className="text-xs">2</span>}
                        </div>
                        <span className="text-sm">Skills defined ({skillNodes.length})</span>
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${getTotalWeight() === 100 ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${getTotalWeight() === 100 ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                          {getTotalWeight() === 100 ? <Icons.Check className="h-3 w-3" /> : <Icons.AlertTriangle className="h-3 w-3" />}
                        </div>
                        <span className="text-sm">Weights total 100% ({getTotalWeight()}%)</span>
                      </div>
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${getMappedCourseIds().size > 0 ? 'bg-green-500/10' : 'bg-muted'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${getMappedCourseIds().size > 0 ? 'bg-green-500 text-white' : 'bg-muted-foreground/30'}`}>
                          {getMappedCourseIds().size > 0 ? <Icons.Check className="h-3 w-3" /> : <span className="text-xs">4</span>}
                        </div>
                        <span className="text-sm">Courses mapped ({getMappedCourseIds().size})</span>
                      </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                      <div className="text-center">
                        <p className="text-xl font-bold text-primary">{skillNodes.length}</p>
                        <p className="text-xs text-muted-foreground">Skills</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-500">{getMappedCourseIds().size}</p>
                        <p className="text-xs text-muted-foreground">Courses</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xl font-bold ${getTotalWeight() === 100 ? 'text-primary' : 'text-destructive'}`}>
                          {getTotalWeight()}%
                        </p>
                        <p className="text-xs text-muted-foreground">Total Weight</p>
                      </div>
                    </div>
                  </Card>
                  
                  {/* Skill Breakdown with Drag Reorder */}
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Skill Order
                        {skillNodes.length > 0 && (
                          <Badge variant="outline" className="text-[10px] ml-2">
                            <Move className="h-3 w-3 mr-1" />
                            Drag to reorder
                          </Badge>
                        )}
                      </h3>
                      <Button variant="outline" size="sm" onClick={autoBalanceWeights} disabled={skillNodes.length === 0}>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Auto-balance
                      </Button>
                    </div>
                    
                    {skillNodes.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No skills added yet</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[280px] pr-4">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleSkillDragEnd}
                        >
                          <SortableContext
                            items={skillNodes.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {skillNodes.map((skill, index) => (
                                <SortableSkillItem
                                  key={skill.id}
                                  skill={skill}
                                  colorStyle={getSkillColor(skill.color)}
                                  getIcon={getIcon}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </ScrollArea>
                    )}
                  </Card>
                  
                  {/* Weight Distribution Bar */}
                  <Card className="p-5 lg:col-span-2">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Weight Distribution
                    </h3>
                    {skillNodes.length > 0 ? (
                      <>
                        <div className="h-6 rounded-full overflow-hidden flex bg-muted">
                          {skillNodes.map((skill) => {
                            const colorStyle = getSkillColor(skill.color);
                            return (
                              <div
                                key={skill.id}
                                className={`h-full ${colorStyle.solid} transition-all duration-300`}
                                style={{ width: `${skill.weight}%` }}
                                title={`${skill.name}: ${skill.weight}%`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-3">
                          {skillNodes.map(skill => {
                            const colorStyle = getSkillColor(skill.color);
                            return (
                              <div key={skill.id} className="flex items-center gap-1.5 text-xs">
                                <div className={`w-3 h-3 rounded-full ${colorStyle.solid}`} />
                                <span className="font-medium">{skill.name}</span>
                                <span className="text-muted-foreground">({skill.weight}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-center text-muted-foreground text-sm">
                        Add skills to see weight distribution
                      </div>
                    )}
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="flex-1 overflow-auto">
                <Card className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Career Name *</Label>
                      <Input
                        placeholder="e.g., Data Scientist"
                        value={careerName}
                        onChange={(e) => {
                          setCareerName(e.target.value);
                          if (!id) setCareerSlug(generateSlug(e.target.value));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug *</Label>
                      <Input
                        placeholder="e.g., data-scientist"
                        value={careerSlug}
                        onChange={(e) => setCareerSlug(generateSlug(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief description of this career path..."
                      value={careerDescription}
                      onChange={(e) => setCareerDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select value={careerIcon} onValueChange={setCareerIcon}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {careerIconOptions.map(icon => (
                            <SelectItem key={icon} value={icon}>
                              <div className="flex items-center gap-2">
                                {getIcon(icon)}
                                {icon}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Color Theme</Label>
                      <Select value={careerColor} onValueChange={setCareerColor}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {careerColorOptions.map(color => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded ${color.value}`} />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Order</Label>
                      <Input
                        type="number"
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Course Library with Vertical Tab Toggle */}
          <div className="flex-shrink-0 flex">
            {/* Vertical Tab Toggle - Always visible */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex flex-col items-center justify-start gap-1 py-3 px-1 bg-muted/50 hover:bg-muted border-y border-l rounded-l-md transition-colors cursor-pointer"
            >
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
              <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
                Courses
              </span>
            </button>

            {/* Sidebar Content */}
            <Card className={`flex flex-col min-h-0 transition-all duration-300 rounded-l-none border-l-0 ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-0 p-0'}`}>
              <div className={`p-4 border-b flex-shrink-0 ${!sidebarOpen ? 'hidden' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm whitespace-nowrap">Course Library</h3>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              
              <ScrollArea className={`flex-1 ${!sidebarOpen ? 'hidden' : ''}`}>
                <div className="p-2 space-y-1">
                  {filteredCourses.map(course => {
                    const isMapped = getMappedCourseIds().has(course.id);
                    return (
                      <div
                        key={course.id}
                        draggable
                        onDragStart={(e) => handleCourseDragStart(e, course.id)}
                        onDragEnd={handleCourseDragEnd}
                        className={`
                          flex items-center gap-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing
                          transition-all duration-150
                          ${isMapped 
                            ? 'bg-primary/5 border-primary/30' 
                            : 'bg-card hover:bg-muted/50 border-border'
                          }
                          ${draggingCourse === course.id ? 'opacity-50 scale-95' : ''}
                        `}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{course.name}</p>
                        </div>
                        {isMapped && (
                          <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                            Mapped
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>

      {/* Skill Editor Dialog */}
      <Dialog open={skillEditorOpen} onOpenChange={setSkillEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
            <DialogDescription>
              Configure skill name, weight, and appearance
            </DialogDescription>
          </DialogHeader>
          
          {editingSkill && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Skill Name</Label>
                <Input
                  value={editingSkill.name}
                  onChange={(e) => updateSkill({ name: e.target.value })}
                  placeholder="e.g., Python Programming"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Weight ({editingSkill.weight}%)</Label>
                <Slider
                  value={[editingSkill.weight]}
                  onValueChange={([v]) => updateSkill({ weight: v })}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  How much this skill contributes to overall career readiness
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={editingSkill.icon} onValueChange={(v) => updateSkill({ icon: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillIconOptions.map(icon => (
                        <SelectItem key={icon} value={icon}>
                          <div className="flex items-center gap-2">
                            {getIcon(icon)}
                            {icon}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={editingSkill.color} onValueChange={(v) => updateSkill({ color: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillColorOptions.map(color => (
                        <SelectItem key={color.name} value={color.name}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${color.bg} ${color.border} border`} />
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mapped courses in skill */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mapped Courses ({editingSkill.courses.length})</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openAddCoursesDialog(editingSkill.id)}
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Add Courses
                  </Button>
                </div>
                {editingSkill.courses.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editingSkill.courses.map(({ courseId, contribution }) => {
                      const course = courses.find(c => c.id === courseId);
                      return (
                        <div key={courseId} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm flex-1 truncate">{course?.name}</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={contribution}
                            onChange={(e) => {
                              const newContribution = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              updateCourseContribution(editingSkill.id, courseId, newContribution);
                              // Also update editingSkill state
                              setEditingSkill(prev => prev ? {
                                ...prev,
                                courses: prev.courses.map(c => 
                                  c.courseId === courseId ? { ...c, contribution: newContribution } : c
                                )
                              } : null);
                            }}
                            className="w-16 h-7 text-xs text-center"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              removeCourseFromSkill(editingSkill.id, courseId);
                              // Also update editingSkill state
                              setEditingSkill(prev => prev ? {
                                ...prev,
                                courses: prev.courses.filter(c => c.courseId !== courseId)
                              } : null);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                    No courses mapped. Click "Add Courses" to add.
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => editingSkill && deleteSkill(editingSkill.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Skill
            </Button>
            <Button onClick={() => setSkillEditorOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Contribution Dialog */}
      <Dialog open={contributionDialogOpen} onOpenChange={setContributionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Contribution Level</DialogTitle>
            <DialogDescription>
              How much does this course contribute to the skill?
            </DialogDescription>
          </DialogHeader>
          
          {pendingCourseMapping && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">
                  {courses.find(c => c.id === pendingCourseMapping.courseId)?.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  → {skillNodes.find(s => s.id === pendingCourseMapping.skillId)?.name}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Contribution</Label>
                  <span className="text-lg font-bold text-primary">{contributionValue}%</span>
                </div>
                <Slider
                  value={[contributionValue]}
                  onValueChange={([v]) => setContributionValue(v)}
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low impact</span>
                  <span>Full mastery</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCourseMapping}>
              <Zap className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Multiple Courses Dialog */}
      <Dialog open={addCoursesDialogOpen} onOpenChange={setAddCoursesDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Courses to Skill</DialogTitle>
            <DialogDescription>
              Select multiple courses and set their contribution levels
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 space-y-4">
            {/* Shared Contribution Control */}
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs font-medium">Shared Contribution Level</Label>
                  <p className="text-[10px] text-muted-foreground">Apply same % to all selected courses</p>
                </div>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[sharedContribution]}
                    onValueChange={([v]) => {
                      setSharedContribution(v);
                      if (useSharedContribution) {
                        applySharedContributionToAll();
                      }
                    }}
                    max={100}
                    step={5}
                    className="w-24"
                  />
                  <span className="text-sm font-medium w-12 text-right">{sharedContribution}%</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={applySharedContributionToAll}
                  disabled={selectedCoursesToAdd.length === 0}
                >
                  Apply All
                </Button>
              </div>
            </Card>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <ScrollArea className="h-[260px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredCourses.map(course => {
                  const skill = skillNodes.find(s => s.id === addCoursesSkillId);
                  const isAlreadyMapped = skill?.courses.some(c => c.courseId === course.id);
                  const isSelected = selectedCoursesToAdd.some(c => c.courseId === course.id);
                  const selectedCourse = selectedCoursesToAdd.find(c => c.courseId === course.id);
                  
                  if (isAlreadyMapped) return null;
                  
                  return (
                    <div
                      key={course.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-primary/10 border-primary/30' 
                          : 'bg-card hover:bg-muted/50 border-border'
                      }`}
                      onClick={() => toggleCourseSelection(course.id)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-muted-foreground pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{course.name}</p>
                          {course.description && (
                            <p className="text-xs text-muted-foreground truncate">{course.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={selectedCourse?.contribution || sharedContribution}
                              onChange={(e) => updateSelectedCourseContribution(
                                course.id, 
                                Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                              )}
                              className="w-16 h-7 text-xs text-center"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            {selectedCoursesToAdd.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedCoursesToAdd.length} course(s) selected
                </span>
                <span className="text-muted-foreground">
                  Avg: {Math.round(selectedCoursesToAdd.reduce((sum, c) => sum + c.contribution, 0) / selectedCoursesToAdd.length)}%
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCoursesDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmAddMultipleCourses}
              disabled={selectedCoursesToAdd.length === 0}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Add {selectedCoursesToAdd.length} Course(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCareerEditor;
