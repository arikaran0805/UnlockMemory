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
import { Switch } from "@/components/ui/switch";
import {
  Save, X, BookOpen, Sparkles, MousePointerClick,
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
interface CourseNode {
  id: string;        // local id (matches career_skills.id when loaded from DB)
  courseId: string;  // DB courses.id
  name: string;      // course name for display
  weight: number;    // contribution % to this career
  icon: string;
  color: string;
  x: number;
  y: number;
}

interface SkillContribution {
  skill_name: string;
  contribution: number;
}

// Sortable Course Item Component
interface SortableCourseItemProps {
  skill: CourseNode;
  colorStyle: {
    name: string;
    bg: string;
    border: string;
    text: string;
    ring: string;
  };
  getIcon: (iconName: string) => React.ReactNode;
}

const SortableCourseItem = ({ skill, colorStyle, getIcon }: SortableCourseItemProps) => {
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
        value={skill.weight}
        className="h-1.5 mb-2"
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Course weight</span>
        <span className="font-semibold">{skill.weight}%</span>
      </div>
    </div>
  );
};

interface Course {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  original_price?: number | null;
  discount_price?: number | null;
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
  const [activeTab, setActiveTab] = useState("settings");

  // Career form state
  const [careerName, setCareerName] = useState("");
  const [careerSlug, setCareerSlug] = useState("");
  const [careerDescription, setCareerDescription] = useState("");
  const [careerIcon, setCareerIcon] = useState("Briefcase");
  const [careerColor, setCareerColor] = useState(careerColorOptions[0].value);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [careerStatus, setCareerStatus] = useState("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [careerDiscount, setCareerDiscount] = useState(0);
  const [originalAuthorId, setOriginalAuthorId] = useState<string | null>(null);

  // Canvas state
  const [courseNodes, setCourseNodes] = useState<CourseNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Dialogs
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<CourseNode | null>(null);

  // Add Course picker state
  const [addCoursesDialogOpen, setAddCoursesDialogOpen] = useState(false);
  const [selectedCoursesToAdd, setSelectedCoursesToAdd] = useState<{courseId: string; contribution: number}[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [addCourseWeight, setAddCourseWeight] = useState(25);
  const [addCourseIcon, setAddCourseIcon] = useState(skillIconOptions[0]);
  const [addCourseColor, setAddCourseColor] = useState(skillColorOptions[0].name);

  // Track if user has attempted to save (for validation display)
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  // DnD sensors for course node reordering
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

  // Filtered courses for the Add Course dialog search
  const filteredCourses = courses.filter(course =>
    !courseSearch || course.name.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const handleNodeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCourseNodes((items) => {
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
        .select("id, name, slug, description, original_price, discount_price")
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
      setIsFeatured(career.is_featured ?? false);
      setCareerDiscount(Number(career.discount_percentage) || 0);

      // For each career_course DB row, reconstruct a CourseNode
      const nodes: CourseNode[] = (coursesRes.data || []).map((cc, index) => {
        // Find matching skill in skillsRes to get icon/color/position
        const matchingSkill = (skillsRes.data || []).find(s => {
          const contribs = Array.isArray(cc.skill_contributions)
            ? (cc.skill_contributions as unknown as SkillContribution[])
            : [];
          return contribs.some(c => c.skill_name === s.skill_name);
        });
        const courseName = (cc.course as any)?.name || 'Unknown Course';
        return {
          id: matchingSkill?.id || `course-${cc.course_id}`,
          courseId: cc.course_id,
          name: courseName,
          weight: matchingSkill?.weight || 25,
          icon: matchingSkill?.icon || skillIconOptions[index % skillIconOptions.length],
          color: matchingSkill?.color || skillColorOptions[index % skillColorOptions.length].name,
          x: 100 + (index % 3) * 280,
          y: 100 + Math.floor(index / 3) * 180,
        };
      });

      setCourseNodes(nodes);
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

    // Open Add Course dialog when double-clicking on canvas
    setSelectedCoursesToAdd([]);
    setCourseSearch("");
    const nextIdx = courseNodes.length;
    setAddCourseWeight(25);
    setAddCourseIcon(skillIconOptions[nextIdx % skillIconOptions.length]);
    setAddCourseColor(skillColorOptions[nextIdx % skillColorOptions.length].name);
    setAddCoursesDialogOpen(true);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = courseNodes.find(s => s.id === nodeId);
    if (!node) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingNode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setCourseNodes(prev => prev.map(s =>
      s.id === draggingNode
        ? { ...s, x: Math.max(0, Math.min(x, rect.width - 200)), y: Math.max(0, Math.min(y, rect.height - 80)) }
        : s
    ));
  }, [draggingNode, dragOffset]);

  const handleCanvasMouseUp = () => {
    setDraggingNode(null);
  };

  // Toggle single course selection (radio-style)
  const toggleCourseSelection = (courseId: string) => {
    setSelectedCoursesToAdd(prev => {
      const exists = prev.find(c => c.courseId === courseId);
      if (exists) {
        return [];
      }
      return [{ courseId, contribution: 25 }];
    });
  };

  const confirmAddCourse = () => {
    if (selectedCoursesToAdd.length !== 1) return;
    const { courseId } = selectedCoursesToAdd[0];
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    // Prevent duplicate
    if (courseNodes.some(n => n.courseId === courseId)) {
      toast({ title: "Course already added to this career" });
      return;
    }

    const idx = courseNodes.length;
    const newNode: CourseNode = {
      id: `course-${Date.now()}`,
      courseId,
      name: course.name,
      weight: addCourseWeight,
      icon: addCourseIcon,
      color: addCourseColor,
      x: 100 + (idx % 3) * 280,
      y: 100 + Math.floor(idx / 3) * 180,
    };
    setCourseNodes(prev => [...prev, newNode]);
    setAddCoursesDialogOpen(false);
    setSelectedCoursesToAdd([]);
    setCourseSearch("");
    setAddCourseWeight(25);
    setAddCourseIcon(skillIconOptions[0]);
    setAddCourseColor(skillColorOptions[0].name);
  };

  // Node management
  const deleteNode = (nodeId: string) => {
    setCourseNodes(prev => prev.filter(s => s.id !== nodeId));
    setSelectedNode(null);
    setNodeEditorOpen(false);
  };

  const updateNode = (updates: Partial<CourseNode>) => {
    if (!editingNode) return;
    setCourseNodes(prev => prev.map(s =>
      s.id === editingNode.id ? { ...s, ...updates } : s
    ));
    setEditingNode(prev => prev ? { ...prev, ...updates } : null);
  };

  const autoBalanceWeights = () => {
    if (courseNodes.length === 0) return;
    const equalWeight = Math.floor(100 / courseNodes.length);
    const remainder = 100 - (equalWeight * courseNodes.length);
    setCourseNodes(prev => prev.map((node, index) => ({
      ...node,
      weight: equalWeight + (index < remainder ? 1 : 0),
    })));
  };

  // Calculations
  const getTotalWeight = () => courseNodes.reduce((sum, s) => sum + s.weight, 0);

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

  // Generate radar chart data from course nodes
  const getSkillRadarData = () => {
    if (courseNodes.length === 0) return [];
    return courseNodes.map(node => ({
      skill: node.name,
      value: node.weight,
      fullMark: 100,
    }));
  };

  const getMappedCourseIds = () => {
    const ids = new Set<string>();
    courseNodes.forEach(node => ids.add(node.courseId));
    return ids;
  };

  // Validation
  // Draft: only name + slug required (save anytime)
  // Published: full strict validation
  const getValidationErrors = (forPublish = careerStatus === "published") => {
    const errors: string[] = [];

    if (!careerName.trim()) errors.push("Career name is required");
    if (!careerSlug.trim()) errors.push("Career slug is required");

    if (forPublish) {
      if (courseNodes.length === 0) {
        errors.push("Add at least 1 course before publishing");
      }
      if (courseNodes.length > 0 && getTotalWeight() !== 100) {
        errors.push(`Course weights must total 100% (currently ${getTotalWeight()}%)`);
      }
    }

    return errors;
  };

  // Publish readiness checks (used in Publishing card UI)
  const getPublishReadiness = () => [
    { done: !!careerName.trim(), label: "Career name set" },
    { done: !!careerSlug.trim(), label: "URL slug set" },
    { done: courseNodes.length > 0, label: `Courses added (${courseNodes.length})` },
    { done: courseNodes.length > 0 && getTotalWeight() === 100, label: `Weights balanced at 100% (${getTotalWeight()}%)` },
  ];

  const isValid = () => getValidationErrors().length === 0;

  // Save
  const handleSubmit = async () => {
    // Mark that user has attempted to save
    setHasAttemptedSave(true);

    try {
      const errors = getValidationErrors();

      if (errors.length > 0) {
        toast({
          title: careerStatus === "published" ? "Cannot publish career" : "Cannot save career",
          description: careerStatus === "published"
            ? `Complete all requirements first: ${errors[0]}`
            : errors[0],
          variant: "destructive",
        });
        // Switch to Settings tab so user can see the publish checklist
        if (careerStatus === "published") setActiveTab("settings");
        return;
      }

      setLoading(true);

      // Each CourseNode becomes one career_skill + one career_courses entry
      // This keeps useCareers() and profile radar working (they read career_skills + skill_contributions)
      const skillsToInsert = courseNodes.map((node, idx) => ({
        career_id: id || "",
        skill_name: node.name,
        display_order: idx + 1,
        weight: node.weight,
        icon: node.icon,
        color: node.color,
      }));
      const coursesToInsert = courseNodes.map(node => ({
        career_id: id || "",
        course_id: node.courseId,
        skill_contributions: [{ skill_name: node.name, contribution: node.weight }] as unknown as Json,
      }));

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
            discount_percentage: careerDiscount,
            status: careerStatus,
            is_featured: isFeatured,
          })
          .eq("id", id);

        if (error) throw error;

        // Update skills
        await supabase.from("career_skills").delete().eq("career_id", id);
        if (courseNodes.length > 0) {
          const skillsWithId = skillsToInsert.map(s => ({ ...s, career_id: id }));
          await supabase.from("career_skills").insert(skillsWithId);
        }

        // Update courses
        await supabase.from("career_courses").delete().eq("career_id", id);
        if (courseNodes.length > 0) {
          const coursesWithId = coursesToInsert.map(c => ({ ...c, career_id: id }));
          await supabase.from("career_courses").insert(coursesWithId);
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
            discount_percentage: careerDiscount,
            status: careerStatus,
            is_featured: isFeatured,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert skills
        if (courseNodes.length > 0) {
          const skillsWithId = skillsToInsert.map(s => ({ ...s, career_id: newCareer.id }));
          await supabase.from("career_skills").insert(skillsWithId);
        }

        // Insert courses
        if (courseNodes.length > 0) {
          const coursesWithId = coursesToInsert.map(c => ({ ...c, career_id: newCareer.id }));
          await supabase.from("career_courses").insert(coursesWithId);
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
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-muted-foreground">Loading career...</div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-0">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          {/* Left — title + status */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold text-foreground">{careerName || "New Career"}</h1>
              {careerStatus === "published" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-500/12 text-green-700 dark:text-green-400 border border-green-500/25">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-70" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  Draft
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Configure career tracks, skills, and course mappings
            </p>
          </div>

          {/* Right — tabs + actions */}
          <div className="flex items-center gap-3">
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
                <TabsTrigger value="pricing" className="text-xs px-3">
                  <Icons.IndianRupee className="h-3.5 w-3.5 mr-1.5" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs px-3">
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                  Overview
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {hasAttemptedSave && !isValid() && (
              <Badge variant="destructive" className="text-xs">
                <Icons.AlertTriangle className="h-3 w-3 mr-1" />
                {getValidationErrors().length} issue(s)
              </Badge>
            )}
            <Button variant="outline" className="w-[120px]" onClick={() => navigate("/admin/careers")}>
              Cancel
            </Button>
            <Button
              className="w-[120px]"
              onClick={handleSubmit}
              disabled={loading}
              variant={(hasAttemptedSave && !isValid()) ? "outline" : "default"}
            >
              <Save className="h-4 w-4 mr-2" />
              {id ? "Update" : "Create"}
            </Button>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">

        {/* Main Content with Right Sidebar */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left - Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsContent value="canvas" className="flex-1 data-[state=active]:flex data-[state=active]:flex-col">
                <div
                  ref={canvasRef}
                  className="relative w-full rounded-xl border border-border overflow-hidden cursor-crosshair"
                  style={{
                    height: "calc(100vh - 180px)",
                    background: "hsl(var(--card))",
                    backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                  onDoubleClick={handleCanvasDoubleClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                >
                  {/* Floating toolbar — bottom left */}
                  <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2">
                    <button
                      className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCoursesToAdd([]);
                        setCourseSearch("");
                        const nextIdx = courseNodes.length;
                        setAddCourseWeight(25);
                        setAddCourseIcon(skillIconOptions[nextIdx % skillIconOptions.length]);
                        setAddCourseColor(skillColorOptions[nextIdx % skillColorOptions.length].name);
                        setAddCoursesDialogOpen(true);
                      }}
                    >
                      <Icons.Plus className="h-3.5 w-3.5" />
                      Add Course
                    </button>
                    {courseNodes.length > 0 && (
                      <button
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-card border border-border text-foreground shadow-sm hover:bg-muted/60 transition-colors"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); autoBalanceWeights(); }}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Auto-balance
                      </button>
                    )}
                    <span className="px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground bg-card/80 border border-border backdrop-blur-sm">
                      Double-click canvas to add
                    </span>
                  </div>

                  {/* Weight badge — top right */}
                  {courseNodes.length > 0 && (
                    <div className="absolute top-3 right-3 z-20">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border ${
                        getTotalWeight() === 100
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25"
                          : "bg-destructive/10 text-destructive border-destructive/25"
                      }`}>
                        {getTotalWeight() === 100
                          ? <Icons.CheckCircle2 className="h-3.5 w-3.5" />
                          : <Icons.AlertTriangle className="h-3.5 w-3.5" />}
                        Weights: {getTotalWeight()}%
                      </span>
                    </div>
                  )}

                  {/* Empty state */}
                  {courseNodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-muted/60 border-2 border-dashed border-border flex items-center justify-center mx-auto mb-4">
                          <MousePointerClick className="h-7 w-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-base font-semibold text-foreground/60 mb-1">No courses yet</p>
                        <p className="text-sm text-muted-foreground/50">Click "Add Course" or double-click anywhere on the canvas</p>
                      </div>
                    </div>
                  )}

                  {/* Course Nodes */}
                  {courseNodes.map(node => {
                    const colorStyle = getSkillColor(node.color);
                    const isSelected = selectedNode === node.id;

                    return (
                      <div
                        key={node.id}
                        className={`skill-node absolute select-none ${isSelected ? 'z-10' : 'z-0'}`}
                        style={{ left: node.x, top: node.y }}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      >
                        <div className={`
                          w-56 rounded-2xl border bg-card cursor-move overflow-hidden
                          ${isSelected ? 'shadow-xl ring-2 ' + colorStyle.ring : 'shadow-md hover:shadow-xl'}
                          transition-all duration-150
                        `}>
                          {/* Color accent strip */}
                          <div className={`h-1 w-full ${colorStyle.solid}`} />

                          {/* Header */}
                          <div className="p-3 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${colorStyle.bg} ${colorStyle.text}`}>
                                  {getIcon(node.icon)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-foreground truncate leading-tight">{node.name}</p>
                                  <p className={`text-[11px] font-semibold ${colorStyle.text}`}>
                                    {node.weight}% weight
                                  </p>
                                </div>
                              </div>
                              <button
                                className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNode(node);
                                  setNodeEditorOpen(true);
                                }}
                              >
                                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>

                            {/* Weight progress bar */}
                            <div className="mt-2.5 h-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${colorStyle.solid}`}
                                style={{ width: `${node.weight}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 overflow-auto">
                <div className="grid gap-5 lg:grid-cols-2">

                  {/* ── Readiness Checklist ─── */}
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${careerColor}`}>
                        {getIcon(careerIcon)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">{careerName || "Career Name"}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{careerDescription || "No description yet"}</p>
                      </div>
                    </div>

                    {/* Readiness score */}
                    {(() => {
                      const checks = [
                        !!careerName.trim(),
                        courseNodes.length > 0,
                        getTotalWeight() === 100,
                        getMappedCourseIds().size > 0,
                        careerStatus === "published",
                      ];
                      const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
                      return (
                        <div className="p-3.5 rounded-xl bg-muted/50 border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Readiness</p>
                            <p className={`text-sm font-bold ${score === 100 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>{score}%</p>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${score === 100 ? "bg-green-500" : "bg-amber-500"}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      {[
                        { done: !!careerName.trim(), label: "Career name & slug defined" },
                        { done: courseNodes.length > 0, label: `Courses added (${courseNodes.length})` },
                        { done: getTotalWeight() === 100, label: `Weights balanced (${getTotalWeight()}%)`, warn: courseNodes.length > 0 && getTotalWeight() !== 100 },
                        { done: getMappedCourseIds().size > 0, label: `Courses mapped (${getMappedCourseIds().size})` },
                        { done: careerStatus === "published", label: "Published & live" },
                      ].map(({ done, label, warn }, i) => (
                        <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg text-sm transition-colors ${done ? "bg-green-500/8" : warn ? "bg-amber-500/8" : "bg-muted/40"}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500 text-white" : warn ? "bg-amber-500 text-white" : "bg-muted-foreground/20"}`}>
                            {done ? <Icons.Check className="h-3 w-3" /> : warn ? <Icons.AlertTriangle className="h-3 w-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                          </div>
                          <span className={done ? "text-foreground/80" : "text-muted-foreground"}>{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                      <div className="text-center p-2 rounded-lg bg-muted/40">
                        <p className="text-xl font-bold text-primary">{courseNodes.length}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Courses</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/40">
                        <p className="text-xl font-bold text-green-500">{getMappedCourseIds().size}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Mapped</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/40">
                        <p className={`text-xl font-bold ${getTotalWeight() === 100 ? "text-primary" : "text-destructive"}`}>{getTotalWeight()}%</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Weight</p>
                      </div>
                    </div>
                  </Card>

                  {/* ── Radar Chart ─── */}
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Skill Weight Distribution
                      </h3>
                    </div>
                    {courseNodes.length >= 3 ? (
                      <ChartContainer config={chartConfig} className="h-[380px] w-full">
                        <RadarChart data={getSkillRadarData()} outerRadius="72%" margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                          <PolarGrid className="stroke-border" />
                          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar
                            name="Weight"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.18}
                            strokeWidth={2.5}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RadarChart>
                      </ChartContainer>
                    ) : (
                      <div className="h-[380px] flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                          <TrendingUp className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Add 3+ courses to see radar</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Currently {courseNodes.length} course{courseNodes.length !== 1 ? "s" : ""}</p>
                      </div>
                    )}
                  </Card>

                  {/* ── Weight Bar ─── */}
                  <Card className="p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Course Breakdown
                      </h3>
                      <Button variant="outline" size="sm" onClick={autoBalanceWeights} disabled={courseNodes.length === 0} className="h-7 text-xs">
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        Auto-balance
                      </Button>
                    </div>

                    {courseNodes.length > 0 ? (
                      <>
                        {/* Segmented weight bar */}
                        <div className="h-3 rounded-full overflow-hidden flex gap-px bg-muted mb-4">
                          {courseNodes.map((node) => {
                            const cs = getSkillColor(node.color);
                            return (
                              <div
                                key={node.id}
                                className={`h-full ${cs.solid} transition-all duration-300`}
                                style={{ width: `${node.weight}%` }}
                                title={`${node.name}: ${node.weight}%`}
                              />
                            );
                          })}
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          {courseNodes.map(node => {
                            const cs = getSkillColor(node.color);
                            return (
                              <div key={node.id} className="flex items-center gap-1.5 text-xs">
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cs.solid}`} />
                                <span className="font-medium text-foreground/80">{node.name}</span>
                                <span className="text-muted-foreground">({node.weight}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Add courses in the Skill Canvas tab</p>
                      </div>
                    )}
                  </Card>

                  {/* ── Course Order (drag reorder) ─── */}
                  <Card className="p-5 lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Icons.GripVertical className="h-4 w-4 text-primary" />
                        Course Order
                      </h3>
                      {courseNodes.length > 0 && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Drag to reorder
                        </span>
                      )}
                    </div>

                    {courseNodes.length > 0 ? (
                      <ScrollArea className="pr-2">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleNodeDragEnd}>
                          <SortableContext items={courseNodes.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                              {courseNodes.map((node) => (
                                <SortableCourseItem
                                  key={node.id}
                                  skill={node}
                                  colorStyle={getSkillColor(node.color)}
                                  getIcon={getIcon}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </ScrollArea>
                    ) : (
                      <div className="py-8 text-center">
                        <Icons.GripVertical className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No courses to order yet</p>
                      </div>
                    )}
                  </Card>

                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="flex-1 overflow-auto">
                {(() => {
                  const mappedIds = getMappedCourseIds();
                  const mappedCourses = courses.filter(c => mappedIds.has(c.id));
                  const totalOriginal = mappedCourses.reduce((sum, c) => sum + (Number(c.original_price) || 0), 0);
                  const discountedTotal = careerDiscount > 0 ? Math.round(totalOriginal * (1 - careerDiscount / 100)) : totalOriginal;
                  const savings = totalOriginal - discountedTotal;

                  return (
                    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

                      {/* Left — course list */}
                      <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1 h-4 rounded-full bg-primary" />
                          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Included Courses</h3>
                        </div>

                        {mappedCourses.length > 0 ? (
                          <div className="space-y-2">
                            {mappedCourses.map((course, i) => (
                              <div key={course.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{course.name}</p>
                                  </div>
                                </div>
                                <span className="text-sm font-bold text-foreground flex-shrink-0 ml-3">
                                  {Number(course.original_price) ? `₹${Number(course.original_price).toLocaleString("en-IN")}` : <span className="text-muted-foreground font-normal">Free</span>}
                                </span>
                              </div>
                            ))}

                            <div className="flex items-center justify-between pt-3 border-t border-border/50 px-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subtotal ({mappedCourses.length} courses)</span>
                              <span className="text-sm font-bold">₹{totalOriginal.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-14 text-center">
                            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                              <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No courses mapped yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Add courses in the Skill Canvas tab</p>
                          </div>
                        )}
                      </Card>

                      {/* Right — pricing summary */}
                      <div className="space-y-4">
                        {/* Discount input */}
                        <Card className="p-5 space-y-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-4 rounded-full bg-primary" />
                            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Bundle Discount</h3>
                          </div>

                          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-foreground/70 mb-0.5">Discount %</p>
                              <p className="text-[11px] text-muted-foreground">Applied to bundle total</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={careerDiscount === 0 ? "" : careerDiscount}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "") { setCareerDiscount(0); return; }
                                  setCareerDiscount(Math.min(100, Math.max(0, parseInt(val) || 0)));
                                }}
                                className="w-20 h-9 text-center font-bold text-base"
                              />
                              <span className="text-base font-semibold text-muted-foreground">%</span>
                            </div>
                          </div>

                          {careerDiscount > 0 && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/8 border border-green-500/20 text-green-700 dark:text-green-400">
                              <Icons.BadgePercent className="h-4 w-4 flex-shrink-0" />
                              <span className="text-xs font-semibold">
                                Students save ₹{savings.toLocaleString("en-IN")} ({careerDiscount}% off)
                              </span>
                            </div>
                          )}
                        </Card>

                        {/* Price summary */}
                        <Card className="p-5">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Original total</span>
                              <span className={`font-semibold ${careerDiscount > 0 ? "line-through text-muted-foreground" : ""}`}>
                                ₹{totalOriginal.toLocaleString("en-IN")}
                              </span>
                            </div>
                            {careerDiscount > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Discount ({careerDiscount}%)</span>
                                <span className="font-semibold text-green-600 dark:text-green-400">-₹{savings.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-3 border-t border-border">
                              <span className="font-bold text-base">Bundle Price</span>
                              <div className="text-right">
                                <p className="text-2xl font-black text-primary">₹{discountedTotal.toLocaleString("en-IN")}</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>

                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="settings" className="flex-1 overflow-auto">
                <div className="space-y-5">

                  {/* ── Identity ─────────────────────────────── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 rounded-full bg-primary" />
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Identity</p>
                    </div>
                    <Card className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/80">Career Name <span className="text-destructive">*</span></Label>
                          <Input
                            placeholder="e.g., Data Scientist"
                            value={careerName}
                            onChange={(e) => {
                              setCareerName(e.target.value);
                              if (!id) setCareerSlug(generateSlug(e.target.value));
                            }}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/80">URL Slug <span className="text-destructive">*</span></Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">/career/</span>
                            <Input
                              placeholder="data-scientist"
                              value={careerSlug}
                              onChange={(e) => setCareerSlug(generateSlug(e.target.value))}
                              className="h-9 pl-[58px] font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/80">Description</Label>
                        <Textarea
                          placeholder="Brief description of this career path — shown on the public career card…"
                          value={careerDescription}
                          onChange={(e) => setCareerDescription(e.target.value)}
                          rows={3}
                          className="resize-none text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">{careerDescription.length}/300 characters</p>
                      </div>
                    </Card>
                  </div>

                  {/* ── Appearance ───────────────────────────── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 rounded-full bg-primary" />
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Appearance</p>
                    </div>
                    <Card className="p-5">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/80">Icon</Label>
                          <Select value={careerIcon} onValueChange={setCareerIcon}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {careerIconOptions.map(icon => (
                                <SelectItem key={icon} value={icon}>
                                  <div className="flex items-center gap-2">
                                    {getIcon(icon)}
                                    <span className="text-sm">{icon}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/80">Color Theme</Label>
                          <Select value={careerColor} onValueChange={setCareerColor}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {careerColorOptions.map(color => (
                                <SelectItem key={color.value} value={color.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3.5 h-3.5 rounded-full border ${color.value}`} />
                                    <span className="text-sm">{color.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Live Preview chip */}
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Card Preview</p>
                        <div className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm font-semibold ${careerColor}`}>
                          {getIcon(careerIcon)}
                          <span>{careerName || "Career Name"}</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* ── Publishing ───────────────────────────── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 rounded-full bg-primary" />
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Publishing</p>
                    </div>
                    <Card className="p-5 space-y-4">
                      {/* Live toggle */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-foreground">Publish Status</p>
                          <p className="text-[12px] text-muted-foreground">
                            {careerStatus === "published"
                              ? "This career path is visible to students on the public site. All requirements below must be met to save."
                              : "This career path is hidden from students. You can save at any time — even incomplete."}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-6 flex-shrink-0">
                          <span className={`text-xs font-semibold ${careerStatus === "published" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {careerStatus === "published" ? "Live" : "Draft"}
                          </span>
                          <Switch
                            checked={careerStatus === "published"}
                            onCheckedChange={(checked) => {
                              setCareerStatus(checked ? "published" : "draft");
                              if (!checked) setIsFeatured(false); // can't be featured in draft
                            }}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                      </div>

                      {/* Publish readiness checklist — shown when Live is toggled on */}
                      {careerStatus === "published" && (() => {
                        const checks = getPublishReadiness();
                        const allDone = checks.every(c => c.done);
                        return (
                          <div className={`rounded-xl border p-4 space-y-2.5 ${allDone ? "bg-green-500/6 border-green-500/20" : "bg-amber-500/6 border-amber-500/20"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {allDone
                                ? <Icons.CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                : <Icons.AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                              <p className={`text-xs font-bold uppercase tracking-wide ${allDone ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                                {allDone ? "Ready to publish" : "Required before saving as Live"}
                              </p>
                            </div>
                            {checks.map(({ done, label }, i) => (
                              <div key={i} className="flex items-center gap-2.5 text-xs">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500 text-white" : "bg-border text-muted-foreground"}`}>
                                  {done
                                    ? <Icons.Check className="h-2.5 w-2.5" />
                                    : <span className="text-[9px] font-bold">{i + 1}</span>}
                                </div>
                                <span className={done ? "text-foreground/70 line-through" : "text-foreground/90 font-medium"}>{label}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Featured toggle */}
                      <div className="pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">Featured Career</p>
                              {isFeatured && careerStatus === "published" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/25">
                                  <Icons.Star className="h-2.5 w-2.5 fill-current" />
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-muted-foreground">
                              {careerStatus !== "published"
                                ? "Publish this career first to enable featured status."
                                : isFeatured
                                  ? "Highlighted on the Careers page as a top pick."
                                  : "Promote this career on the Careers page as a top pick."}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-6 flex-shrink-0">
                            {careerStatus !== "published" && (
                              <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                                <Icons.Lock className="h-3 w-3" />
                                Publish first
                              </span>
                            )}
                            <Switch
                              checked={isFeatured && careerStatus === "published"}
                              onCheckedChange={(checked) => {
                                if (careerStatus !== "published") return;
                                setIsFeatured(checked);
                              }}
                              disabled={careerStatus !== "published"}
                              className="data-[state=checked]:bg-amber-500 disabled:opacity-40"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Display order */}
                      <div className="pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-foreground">Display Order</p>
                            <p className="text-[12px] text-muted-foreground">Controls the order this career appears on the Careers page.</p>
                          </div>
                          <Input
                            type="number"
                            value={displayOrder}
                            onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                            className="w-24 h-8 text-sm text-center ml-6"
                          />
                        </div>
                      </div>
                    </Card>
                  </div>

                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </div>
    </div>

      {/* Course Node Settings Dialog */}
      <Dialog open={nodeEditorOpen} onOpenChange={setNodeEditorOpen}>
        <DialogContent className="max-w-[480px] p-0 gap-0 overflow-hidden">
          {editingNode && (() => {
            const colorStyle = getSkillColor(editingNode.color);
            return (
              <>
                {/* Colored header strip */}
                <div className={`h-1 w-full ${colorStyle.solid}`} />

                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorStyle.bg} ${colorStyle.text}`}>
                      {getIcon(editingNode.icon)}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground leading-tight">{editingNode.name}</h2>
                      <p className="text-[12px] text-muted-foreground mt-0.5">Course Settings</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">

                  {/* Course name (read-only) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Course</Label>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                      <BookOpen className={`h-4 w-4 flex-shrink-0 ${colorStyle.text}`} />
                      <span className="text-sm font-medium text-foreground/80 truncate">{editingNode.name}</span>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Weight</Label>
                      <div className={`flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg ${colorStyle.bg}`}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={String(editingNode.weight)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            const v = raw === '' ? 0 : Math.min(100, parseInt(raw, 10));
                            updateNode({ weight: v });
                          }}
                          className={`w-9 text-sm font-bold text-right bg-transparent outline-none ${colorStyle.text}`}
                        />
                        <span className={`text-sm font-bold ${colorStyle.text}`}>%</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Slider
                        value={[editingNode.weight]}
                        onValueChange={([v]) => updateNode({ weight: v })}
                        max={100}
                        step={5}
                      />
                      <div className="absolute inset-0 pointer-events-none flex items-center z-10">
                        {[25, 50, 75].map(pct => (
                          <div
                            key={pct}
                            className="absolute w-[2px] h-3.5 rounded-full bg-background"
                            style={{ left: `${pct}%`, transform: "translateX(-50%)", boxShadow: "0 0 0 0.5px rgba(0,0,0,0.15)" }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Icon + Color */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Icon</Label>
                      <Select value={editingNode.icon} onValueChange={(v) => updateNode({ icon: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {skillIconOptions.map(icon => (
                            <SelectItem key={icon} value={icon}>
                              <div className="flex items-center gap-2">
                                {getIcon(icon)}
                                <span className="text-sm">{icon}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Color</Label>
                      <Select value={editingNode.color} onValueChange={(v) => updateNode({ color: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {skillColorOptions.map(color => (
                            <SelectItem key={color.name} value={color.name}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 rounded-full ${color.solid}`} />
                                <span className="text-sm">{color.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between bg-muted/20">
                  <button
                    onClick={() => deleteNode(editingNode.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/8 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Course
                  </button>
                  <button
                    onClick={() => setNodeEditorOpen(false)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Icons.Check className="h-3.5 w-3.5" />
                    Done
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Course to Career Dialog */}
      <Dialog open={addCoursesDialogOpen} onOpenChange={setAddCoursesDialogOpen}>
        {(() => {
          const addColorStyle = getSkillColor(addCourseColor);
          return (
        <DialogContent className="max-w-[500px] p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">

          {/* Dynamic color accent strip */}
          <div className={`h-1 w-full ${addColorStyle.solid} flex-shrink-0`} />

          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border/60 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${addColorStyle.bg} flex items-center justify-center`}>
                <BookOpen className={`h-[18px] w-[18px] ${addColorStyle.text}`} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground leading-tight">Add Course to Career</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Select a course to add to this career path</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-border/40 flex-shrink-0">
            <div
              className="flex items-center gap-2.5 h-9 px-3 rounded-lg border border-border bg-card"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search courses…"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
              />
              {courseSearch && (
                <button onClick={() => setCourseSearch("")} className="text-muted-foreground/50 hover:text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Course list */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-3 space-y-1.5">
              {(() => {
                const alreadyAdded = new Set(courseNodes.map(n => n.courseId));
                const visible = filteredCourses.filter(c => !alreadyAdded.has(c.id));
                if (visible.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <Search className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {courseSearch ? `No courses matching "${courseSearch}"` : "All courses already added"}
                      </p>
                    </div>
                  );
                }
                return visible.map(course => {
                  const isSelected = selectedCoursesToAdd.some(c => c.courseId === course.id);
                  return (
                    <div
                      key={course.id}
                      onClick={() => toggleCourseSelection(course.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary/8 border-primary/25 shadow-sm"
                          : "bg-card border-border/60 hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      {/* Radio-style selector */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? "bg-primary border-primary" : "border-border bg-background"
                      }`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                          {course.name}
                        </p>
                        {course.description && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{course.description}</p>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </ScrollArea>

          {/* Course configuration — always visible */}
          {(() => {
            const colorStyle = addColorStyle;
            const dimmed = selectedCoursesToAdd.length === 0;
            return (
              <div className={`px-6 py-4 border-t border-border/40 flex-shrink-0 space-y-4 bg-muted/10 transition-opacity duration-200 ${dimmed ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                {/* Weight */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Weight</Label>
                    <div className={`flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg ${colorStyle.bg}`}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={String(addCourseWeight)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          const v = raw === '' ? 0 : Math.min(100, parseInt(raw, 10));
                          setAddCourseWeight(v);
                        }}
                        className={`w-9 text-sm font-bold text-right bg-transparent outline-none ${colorStyle.text}`}
                      />
                      <span className={`text-sm font-bold ${colorStyle.text}`}>%</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Slider
                      value={[addCourseWeight]}
                      onValueChange={([v]) => setAddCourseWeight(v)}
                      max={100}
                      step={5}
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center">
                      {[25, 50, 75].map(pct => (
                        <div
                          key={pct}
                          className="absolute w-[1.5px] h-3 rounded-full bg-background/80"
                          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Icon + Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Icon</Label>
                    <Select value={addCourseIcon} onValueChange={setAddCourseIcon}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {skillIconOptions.map(icon => (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              {getIcon(icon)}
                              <span className="text-sm">{icon}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Color</Label>
                    <Select value={addCourseColor} onValueChange={setAddCourseColor}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {skillColorOptions.map(color => (
                          <SelectItem key={color.name} value={color.name}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full ${color.solid}`} />
                              <span className="text-sm">{color.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/60 flex-shrink-0 flex items-center justify-between bg-muted/10">
            <p className="text-xs text-muted-foreground">
              {selectedCoursesToAdd.length > 0
                ? <><span className="font-semibold text-foreground">{selectedCoursesToAdd.length}</span> course selected</>
                : "No course selected"}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAddCoursesDialogOpen(false); setSelectedCoursesToAdd([]); setCourseSearch(""); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground/70 hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddCourse}
                disabled={selectedCoursesToAdd.length !== 1}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Add Course
              </button>
            </div>
          </div>

        </DialogContent>
          );
        })()}
      </Dialog>
    </>
  );
};

export default AdminCareerEditor;
