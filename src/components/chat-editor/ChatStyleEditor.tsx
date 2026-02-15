import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, CourseCharacter, MENTOR_CHARACTER, TAKEAWAY_ICONS } from "./types";
import ChatBubble from "./ChatBubble";
import TakeawayBlock from "./TakeawayBlock";
import { FreeformBlock } from "./FreeformBlock";
import { FreeformCanvasData } from "./freeform";
import { cn } from "@/lib/utils";
import { extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/tiptap";
import { Plus, Eye, Edit3, MessageCircle, Trash2, FileText, Code, Send, Image, Link, Bold, Italic, GripVertical, Pencil, ArrowUp, ArrowDown, Terminal, List, ListOrdered, Heading2, Quote, Lightbulb, Undo2, Redo2, EyeOff, Columns, Maximize2, Minimize2, PenTool, MessageSquarePlus } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { MonacoCodeBlock } from "@/components/code-block";
import { supabase } from "@/integrations/supabase/client";
import { renderCourseIcon } from "./utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
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

// Helper to detect OS for keyboard shortcut display
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

const CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash/Shell" },
  { value: "r", label: "R" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
];

interface BubbleAnnotation {
  bubble_index: number | null;
  status: string;
}

// Annotation data for rich text editor tooltip
interface ExplanationAnnotation {
  id: string;
  selection_start: number;
  selection_end: number;
  selected_text: string;
  comment?: string;
  status: string;
  author_profile?: { full_name?: string | null } | null;
  created_at?: string;
}

interface ChatStyleEditorProps {
  value: string;
  onChange: (value: string) => void;
  courseType?: string;
  placeholder?: string;
  codeTheme?: string;
  annotationMode?: boolean;
  annotations?: BubbleAnnotation[];
  /** Annotations for the explanation section (RichTextEditor) */
  explanationAnnotations?: ExplanationAnnotation[];
  isAdmin?: boolean;
  isModerator?: boolean;
  onAnnotationResolve?: (annotationId: string) => void;
  onAnnotationDismiss?: (annotationId: string) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onTextSelect?: (selection: {
    start: number;
    end: number;
    text: string;
    type: "conversation";
    bubbleIndex?: number;
    rect?: { top: number; left: number; width: number; height: number; bottom: number };
  }) => void;
  onExplanationTextSelect?: (selection: {
    start: number;
    end: number;
    text: string;
    type: 'paragraph' | 'code';
    rect?: { top: number; left: number; width: number; height: number; bottom: number };
  }) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Takeaway format: [TAKEAWAY:icon:title]: content
const TAKEAWAY_REGEX = /^\[TAKEAWAY(?::([^:]*?))?(?::([^\]]*?))?\]:\s*/;
const FREEFORM_REGEX = /^\[FREEFORM_CANVAS\]:(.*)$/;

const parseContent = (content: string): ChatMessage[] => {
  const segments = extractChatSegments(content, { allowSingle: true });
  if (segments.length === 0) return [];

  return segments
    .map((s, index) => {
      // Handle freeform canvas blocks
      const freeformMatch = s.content.match(FREEFORM_REGEX);
      if (s.speaker === "FREEFORM" || freeformMatch) {
        let freeformData;
        try {
          const jsonStr = freeformMatch?.[1] || s.content;
          freeformData = JSON.parse(jsonStr);
        } catch {
          freeformData = undefined;
        }
        return {
          id: `freeform-${index}`,
          speaker: "FREEFORM",
          content: freeformMatch?.[1] || s.content,
          type: "freeform" as const,
          freeformData,
        };
      }

      // Handle takeaway blocks
      const takeawayMatch = s.content.match(TAKEAWAY_REGEX);
      if (s.speaker === "TAKEAWAY" || takeawayMatch) {
        const icon = takeawayMatch?.[1] || "🧠";
        const title = takeawayMatch?.[2] || "One-Line Takeaway for Learners";
        const actualContent = takeawayMatch
          ? s.content.replace(TAKEAWAY_REGEX, "").trim()
          : s.content;
        return {
          // IMPORTANT: deterministic IDs prevent flicker/remounting when value re-parses
          id: `takeaway-${index}`,
          speaker: "TAKEAWAY",
          content: actualContent,
          type: "takeaway" as const,
          takeawayIcon: icon,
          takeawayTitle: title,
        };
      }

      return {
        // IMPORTANT: deterministic IDs prevent flicker/remounting when value re-parses
        id: `msg-${index}-${s.speaker}`,
        speaker: s.speaker,
        content: s.content,
        type: "message" as const,
      };
    })
    .filter((m) => {
      if (!m.speaker.trim()) return false;
      if (m.type === "freeform") return true;
      if (m.type === "takeaway") return true;
      // Strip zero-width and invisible characters before checking
      const visibleContent = m.content.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
      return visibleContent.length > 0;
    });
};

// Use a special marker to preserve newlines within messages during serialization
const NEWLINE_MARKER = "<<<NEWLINE>>>";

const serializeMessages = (messages: ChatMessage[], explanation: string): string => {
  // Filter out empty messages before serializing to prevent ghost bubbles on re-parse
  const nonEmptyMessages = messages.filter((m) => {
    if (m.type === "freeform" || m.type === "takeaway") return true;
    const visibleContent = m.content.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
    return visibleContent.length > 0;
  });
  
  // Join messages with double newline, but encode internal newlines first
  const chatPart = nonEmptyMessages.map((m) => {
    // Handle freeform canvas blocks
    if (m.type === "freeform") {
      const freeformJson = m.freeformData ? JSON.stringify(m.freeformData) : "{}";
      return `FREEFORM: [FREEFORM_CANVAS]:${freeformJson}`;
    }
    // Handle takeaway blocks
    if (m.type === "takeaway") {
      const icon = m.takeawayIcon || "🧠";
      const title = m.takeawayTitle || "One-Line Takeaway for Learners";
      const encodedContent = m.content.replace(/\n/g, NEWLINE_MARKER);
      return `TAKEAWAY: [TAKEAWAY:${icon}:${title}]: ${encodedContent}`;
    }
    // Replace internal newlines with marker to preserve them
    const encodedContent = m.content.replace(/\n/g, NEWLINE_MARKER);
    return `${m.speaker}: ${encodedContent}`;
  }).join("\n\n");
  
  // Restore internal newlines
  const decodedChatPart = chatPart.replace(new RegExp(NEWLINE_MARKER, "g"), "\n");
  
  if (explanation.trim()) {
    return `${decodedChatPart}\n---\n${explanation.trim()}`;
  }
  return decodedChatPart;
};

interface Course {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface InsertBetweenButtonProps {
  onInsertMessage: () => void;
  onInsertTakeaway: () => void;
  onInsertFreeform: () => void;
  courseCharacterName: string;
  mentorName: string;
}

const InsertBetweenButton = ({
  onInsertMessage,
  onInsertTakeaway,
  onInsertFreeform,
  courseCharacterName,
  mentorName,
}: InsertBetweenButtonProps) => {
  return (
    <div className="flex justify-center py-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity group/insert">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-full p-0 bg-muted/50 hover:bg-primary/10 border border-transparent hover:border-primary/30"
          >
            <Plus className="w-3 h-3 text-muted-foreground group-hover/insert:text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56 bg-popover border border-border shadow-lg z-50">
          <DropdownMenuItem onClick={onInsertMessage} className="cursor-pointer">
            <MessageCircle className="w-4 h-4 mr-2" />
            <span>Message</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onInsertTakeaway} className="cursor-pointer">
            <Lightbulb className="w-4 h-4 mr-2" />
            <span>Takeaway Block</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onInsertFreeform} className="cursor-pointer">
            <PenTool className="w-4 h-4 mr-2" />
            <span>Freeform Canvas</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface MessageItemProps {
  message: ChatMessage;
  character: CourseCharacter;
  isMentor: boolean;
  isEditing: boolean;
  onEdit: (id: string, content: string, title?: string, icon?: string, freeformData?: FreeformCanvasData) => void;
  onStartEdit: (id: string | null) => void;
  onEndEdit: () => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onConvertToTakeaway: (id: string) => void;
  onConvertToMessage: (id: string) => void;
  onAnnotateBubble?: (index: number, text: string) => void;
  isEditMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  codeTheme?: string;
  index?: number;
  annotationMode?: boolean;
  hasOpenAnnotations?: boolean;
}

const SortableMessageItem = ({
  message,
  character,
  isMentor,
  isEditing,
  onEdit,
  onStartEdit,
  onEndEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onConvertToTakeaway,
  onConvertToMessage,
  onAnnotateBubble,
  isEditMode,
  isFirst,
  isLast,
  codeTheme,
  index = 0,
  annotationMode,
  hasOpenAnnotations,
}: MessageItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isTakeaway = message.type === "takeaway";
  const isFreeform = message.type === "freeform";

  // Action buttons component
  const ActionButtons = () => (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 backdrop-blur-sm border rounded-lg px-1 py-1 shadow-sm flex-shrink-0",
        isTakeaway ? "mt-8" : "mt-6"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onMoveUp}
        disabled={isFirst}
      >
        <ArrowUp className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onMoveDown}
        disabled={isLast}
      >
        <ArrowDown className="w-3 h-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => onStartEdit(message.id)}
      >
        <Pencil className="w-3 h-3" />
      </Button>
      {isTakeaway ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onConvertToMessage(message.id)}
          title="Convert to message"
        >
          <MessageCircle className="w-3 h-3" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onConvertToTakeaway(message.id)}
          title="Convert to takeaway"
        >
          <Lightbulb className="w-3 h-3" />
        </Button>
      )}
      {/* Annotate bubble button - only in annotation mode */}
      {annotationMode && onAnnotateBubble && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => onAnnotateBubble(index, message.content)}
          title="Annotate this bubble"
        >
          <MessageSquarePlus className="w-3 h-3" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive hover:text-destructive"
        onClick={() => onDelete(message.id)}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

  // For freeform canvas blocks
  if (isFreeform) {
    return (
      <div ref={setNodeRef} style={style}>
        <FreeformBlock
          message={message}
          isEditing={isEditing}
          isEditMode={isEditMode}
          onEdit={(id, content, freeformData) => onEdit(id, content, undefined, undefined, freeformData)}
          onStartEdit={annotationMode ? () => {} : onStartEdit}
          onEndEdit={onEndEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          isFirst={isFirst}
          isLast={isLast}
          dragHandleProps={{ ...attributes, ...listeners }}
          annotationMode={annotationMode}
        />
      </div>
    );
  }

  // For takeaway blocks, always show action buttons on the right
  if (isTakeaway) {
    return (
      <div ref={setNodeRef} style={style} className="group relative flex items-start gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <TakeawayBlock
            message={message}
            isEditing={isEditing}
            onEdit={onEdit}
            onStartEdit={annotationMode ? () => {} : onStartEdit}
            onEndEdit={onEndEdit}
            index={index}
            annotationMode={annotationMode}
            codeTheme={codeTheme}
          />
        </div>
        {isEditMode && !isEditing && !annotationMode && <ActionButtons />}
      </div>
    );
  }

  // For regular messages, position action buttons based on bubble side
  // Mentor bubbles are on the right (flex-row-reverse), so buttons go on left
  // Course bubbles are on the left, so buttons go on right
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "group relative flex items-start gap-2 mb-4",
        isMentor ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Action buttons - position based on bubble side */}
      {isEditMode && !isEditing && !annotationMode && <ActionButtons />}
      
      {/* Main bubble content */}
      <div className="flex-1 min-w-0">
        <ChatBubble
          message={message}
          character={character}
          isMentor={isMentor}
          isEditing={isEditing}
          onEdit={onEdit}
          onStartEdit={annotationMode ? () => {} : onStartEdit}
          onEndEdit={onEndEdit}
          codeTheme={codeTheme}
          hasOpenAnnotations={hasOpenAnnotations}
          annotationMode={annotationMode}
        />
      </div>
    </div>
  );
};

// Preview component for the composer - parses and renders markdown
const ComposerPreview = ({ content, codeTheme }: { content: string; codeTheme?: string }) => {
  // Extract code blocks first
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[2] || '', language: match[1] || 'text' });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }
  
  // Parse inline markdown for text parts
  const parseInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    
    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        nodes.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }
      
      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)(.+?)\1/);
      if (italicMatch) {
        nodes.push(<em key={key++}>{italicMatch[2]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }
      
      // Inline code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        nodes.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">{codeMatch[1]}</code>);
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }
      
      // Link: [text](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        nodes.push(<a key={key++} href={linkMatch[2]} className="text-primary underline">{linkMatch[1]}</a>);
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }
      
      // Regular character
      nodes.push(remaining[0]);
      remaining = remaining.slice(1);
    }
    
    return nodes;
  };
  
  // Parse line-level markdown
  const parseLines = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let key = 0;
    
    for (const line of lines) {
      // Heading: ## text
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;
        nodes.push(<Tag key={key++} className="font-semibold my-1">{parseInline(headingMatch[2])}</Tag>);
        continue;
      }
      
      // Blockquote: > text
      if (line.startsWith('> ')) {
        nodes.push(<blockquote key={key++} className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground">{parseInline(line.slice(2))}</blockquote>);
        continue;
      }
      
      // Bullet list: - or *
      if (line.match(/^[-*]\s+/)) {
        nodes.push(<li key={key++} className="ml-4 list-disc">{parseInline(line.slice(2))}</li>);
        continue;
      }
      
      // Numbered list: 1.
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        nodes.push(<li key={key++} className="ml-4 list-decimal">{parseInline(numberedMatch[2])}</li>);
        continue;
      }
      
      // Regular paragraph
      if (line.trim()) {
        nodes.push(<p key={key++} className="my-0.5">{parseInline(line)}</p>);
      } else {
        nodes.push(<br key={key++} />);
      }
    }
    
    return nodes;
  };
  
  return (
    <div className="space-y-2">
      {parts.map((part, idx) => 
        part.type === 'code' ? (
          <MonacoCodeBlock 
            key={idx} 
            code={part.content} 
            language={part.language || 'text'} 
            showLanguageLabel
          />
        ) : (
          <div key={idx}>{parseLines(part.content)}</div>
        )
      )}
    </div>
  );
};

const ChatStyleEditor = ({
  value,
  onChange,
  courseType = "python",
  placeholder,
  codeTheme,
  annotationMode,
  annotations = [],
  explanationAnnotations = [],
  isAdmin = false,
  isModerator = false,
  onAnnotationResolve,
  onAnnotationDismiss,
  onAnnotationDelete,
  onTextSelect,
  onExplanationTextSelect,
}: ChatStyleEditorProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => parseContent(value));
  const [explanation, setExplanation] = useState<string>(() => extractExplanation(value) || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"mentor" | "course">("mentor");
  
  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<ChatMessage[][]>([]);
  const [redoStack, setRedoStack] = useState<ChatMessage[][]>([]);
  const [selectedCourse, setSelectedCourse] = useState(courseType);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [courses, setCourses] = useState<Course[]>([]);
  const [manualHeight, setManualHeight] = useState<number | null>(null);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [splitViewHeight, setSplitViewHeight] = useState(120); // Custom height for split view
  const splitViewDragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const [mentorIcon, setMentorIcon] = useState("👨‍💻");
  const [composerViewMode, setComposerViewMode] = useState<'edit' | 'split' | 'preview'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatEditorComposerViewMode');
      if (saved === 'edit' || saved === 'split' || saved === 'preview') return saved;
    }
    return 'edit';
  });
  const [splitPanelSizes, setSplitPanelSizes] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatEditorSplitPanelSizes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 2) return parsed;
        } catch {}
      }
    }
    return [50, 50];
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentorName = "Karan";

  // Handle composer view mode change
  const handleComposerViewModeChange = (newMode: 'edit' | 'split' | 'preview') => {
    setComposerViewMode(newMode);
    localStorage.setItem('chatEditorComposerViewMode', newMode);
  };

  // Handle split panel resize
  const handleSplitPanelResize = (sizes: number[]) => {
    setSplitPanelSizes(sizes);
    localStorage.setItem('chatEditorSplitPanelSizes', JSON.stringify(sizes));
  };

  // Icon options for character selection
  const CHARACTER_ICONS = ["👨‍💻", "👩‍💻", "🧑‍💻", "👨‍🏫", "👩‍🏫", "🧑‍🏫", "🎓", "📚", "💡", "🤖", "🧠", "⭐"];

  // Fetch courses from database
  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug, icon")
        .order("name");
      
      if (!error && data) {
        setCourses(data);
        // Set first course as default if current selection is not in the list
        if (data.length > 0 && !data.find(c => c.slug === selectedCourse)) {
          setSelectedCourse(data[0].slug);
        }
      }
    };
    fetchCourses();
  }, []);

  // Sync selectedCourse with courseType prop when it changes
  useEffect(() => {
    if (courseType && courses.length > 0) {
      // Find matching course by slug or name
      const matchingCourse = courses.find(
        c => c.slug === courseType || 
             c.name.toLowerCase().replace(/\s+/g, '') === courseType.toLowerCase()
      );
      if (matchingCourse) {
        setSelectedCourse(matchingCourse.slug);
      }
    }
  }, [courseType, courses]);

  // Get course character from fetched courses
  const getCourseCharacter = useCallback((courseSlug: string): CourseCharacter => {
    const course = courses.find(c => c.slug === courseSlug);
    if (course) {
      return {
        name: course.name,
        emoji: course.icon || "📚",
        color: "hsl(var(--foreground))",
        bgColor: "hsl(var(--muted))",
      };
    }
    return {
      name: "Course",
      emoji: "📚",
      color: "hsl(var(--foreground))",
      bgColor: "hsl(var(--muted))",
    };
  }, [courses]);

  const courseCharacter = getCourseCharacter(selectedCourse);

  useEffect(() => {
    const serialized = serializeMessages(messages, explanation);
    if (serialized !== value) {
      isInternalEditRef.current = true;
      onChange(serialized);
    }
  }, [messages, explanation]);

  // Track if we're in the middle of internal edits to avoid feedback loops
  const isInternalEditRef = useRef(false);

  useEffect(() => {
    // Skip if this update was triggered by our own onChange
    if (isInternalEditRef.current) {
      isInternalEditRef.current = false;
      return;
    }

    const parsed = parseContent(value);
    const parsedExplanation = extractExplanation(value) || "";

    const stripIds = (arr: ChatMessage[]) =>
      arr.map((m) => ({ speaker: m.speaker, content: m.content, type: m.type }));

    if (JSON.stringify(stripIds(parsed)) !== JSON.stringify(stripIds(messages))) {
      // Preserve existing IDs by position to prevent flicker/remounting while syncing.
      setMessages((prev) =>
        parsed.map((m, idx) => ({ ...m, id: prev[idx]?.id ?? m.id }))
      );
    }

    if (parsedExplanation !== explanation) {
      setExplanation(parsedExplanation);
    }
  }, [value]);

  // Don't auto-scroll - let user stay where they are
  // Removed scrollToBottom on messages change

  // Helper to save current state to undo stack
  const saveToUndoStack = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), messages]);
    setRedoStack([]);
  }, [messages]);

  // Undo handler
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, messages]);
    setUndoStack(prev => prev.slice(0, -1));
    setMessages(previousState);
  }, [undoStack, messages]);

  // Redo handler  
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, messages]);
    setRedoStack(prev => prev.slice(0, -1));
    setMessages(nextState);
  }, [redoStack, messages]);

  // handleAddMessage is defined below with manual height reset logic



  const handleInsertCodeSnippet = (language: string = "python") => {
    const codeTemplate = `\`\`\`${language}\n# Your code here\n\n\`\`\``;
    insertAtCursor(codeTemplate, "# Your code here");
  };


  const handleInsertImage = () => {
    insertAtCursor("![Image description](https://example.com/image.png)", "https://example.com/image.png");
  };

  const handleInsertLink = () => {
    insertAtCursor("[Link text](https://example.com)", "https://example.com");
  };

  const handleInsertBold = () => {
    wrapOrInsertFormatting("**", "**", "bold text");
  };

  const handleInsertItalic = () => {
    wrapOrInsertFormatting("*", "*", "italic text");
  };

  const handleInsertInlineCode = () => {
    wrapOrInsertFormatting("`", "`", "code");
  };

  const handleInsertBulletList = () => {
    insertLinePrefix("• ");
  };

  const handleInsertNumberedList = () => {
    insertLinePrefix("1. ");
  };

  const handleInsertHeading = () => {
    insertLinePrefix("## ");
  };

  const handleInsertBlockquote = () => {
    insertLinePrefix("> ");
  };

  // Helper to wrap selected text or insert with placeholder
  const wrapOrInsertFormatting = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = inputRef.current;
    if (!textarea) {
      insertAtCursor(`${prefix}${placeholder}${suffix}`, placeholder);
      return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    if (start !== end) {
      // Has selection - wrap selected text
      const selectedText = value.substring(start, end);
      const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      setNewMessage(newText);
      textarea.focus();
      setTimeout(() => {
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    } else {
      // No selection - insert with placeholder
      const newText = value.substring(0, start) + prefix + placeholder + suffix + value.substring(end);
      setNewMessage(newText);
      textarea.focus();
      setTimeout(() => {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
      }, 0);
    }
  };

  // Helper to add prefix to current line or selected lines
  const insertLinePrefix = (prefix: string) => {
    const textarea = inputRef.current;
    if (!textarea) {
      insertAtCursor(`${prefix}Item 1\n${prefix}Item 2\n${prefix}Item 3`, "Item 1");
      return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    if (start !== end) {
      // Has selection - add prefix to each selected line
      const selectedText = value.substring(start, end);
      const lines = selectedText.split('\n');
      const prefixedLines = lines.map(line => prefix + line).join('\n');
      const newText = value.substring(0, start) + prefixedLines + value.substring(end);
      setNewMessage(newText);
      textarea.focus();
      setTimeout(() => {
        textarea.setSelectionRange(start, start + prefixedLines.length);
      }, 0);
    } else {
      // No selection - insert sample list
      const sampleList = prefix === "1. " 
        ? "1. Item 1\n2. Item 2\n3. Item 3"
        : `${prefix}Item 1\n${prefix}Item 2\n${prefix}Item 3`;
      insertAtCursor(sampleList, "Item 1");
    }
  };

  const insertAtCursor = (text: string, selectText?: string) => {
    const textarea = inputRef.current;
    if (!textarea) {
      setNewMessage((prev) => prev + (prev ? "\n" : "") + text);
      return;
    }
    
    const start = textarea.selectionStart;
    const value = textarea.value;
    const newText = value.substring(0, start) + (value && start > 0 ? "\n" : "") + text + value.substring(start);
    setNewMessage(newText);
    textarea.focus();
    
    setTimeout(() => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
      
      if (selectText) {
        const cursorPos = newText.lastIndexOf(selectText);
        if (cursorPos !== -1) {
          textarea.setSelectionRange(cursorPos, cursorPos + selectText.length);
        }
      }
    }, 0);
  };

  // Auto-resize textarea on content change, but respect manual resize
  useEffect(() => {
    if (inputRef.current && manualHeight === null) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 400)}px`;
    }
  }, [newMessage, manualHeight]);

  // Track manual resizing
  const handleTextareaMouseUp = useCallback(() => {
    if (inputRef.current) {
      const currentHeight = inputRef.current.offsetHeight;
      const computedHeight = inputRef.current.scrollHeight;
      // If heights differ significantly, user manually resized
      if (Math.abs(currentHeight - computedHeight) > 20 || currentHeight > 80) {
        setManualHeight(currentHeight);
      }
    }
  }, []);

  // Reset manual height when message is sent
  const handleAddMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    saveToUndoStack();
    const speaker = currentSpeaker === "mentor" ? mentorName : courseCharacter.name;
    const newMsg: ChatMessage = {
      id: generateId(),
      speaker,
      content: newMessage.trim(),
      type: "message",
    };

    // Append new message at end (bottom of chat) - builds conversation top to bottom
    setMessages((prev) => [...prev, newMsg]);
    setNewMessage("");
    setManualHeight(null); // Reset height after sending
    setCurrentSpeaker((prev) => (prev === "mentor" ? "course" : "mentor"));
    inputRef.current?.focus();
  }, [newMessage, currentSpeaker, courseCharacter.name, saveToUndoStack]);

  const handleAddTakeawayWithUndo = useCallback(() => {
    saveToUndoStack();
    const newTakeaway: ChatMessage = {
      id: generateId(),
      speaker: "TAKEAWAY",
      content: "Enter your takeaway content here...",
      type: "takeaway",
      takeawayTitle: "One-Line Takeaway for Learners",
      takeawayIcon: "🧠",
    };
    setMessages((prev) => [...prev, newTakeaway]);
    setEditingId(newTakeaway.id); // Start editing immediately
  }, [saveToUndoStack]);

  // Handle formatting shortcuts on main textarea
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isModKey = isMac ? e.metaKey : e.ctrlKey;
    
    // Enter sends. Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddMessage();
      return;
    }
    
    // Bold: Ctrl/Cmd + B
    if (isModKey && e.key.toLowerCase() === 'b' && !e.shiftKey) {
      e.preventDefault();
      handleInsertBold();
      return;
    }
    
    // Italic: Ctrl/Cmd + I (without shift)
    if (isModKey && e.key.toLowerCase() === 'i' && !e.shiftKey) {
      e.preventDefault();
      handleInsertItalic();
      return;
    }
    
    // Inline Code: Ctrl/Cmd + `
    if (isModKey && e.key === '`') {
      e.preventDefault();
      handleInsertInlineCode();
      return;
    }
    
    // Bullet List: Ctrl/Cmd + Shift + U
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      handleInsertBulletList();
      return;
    }
    
    // Numbered List: Ctrl/Cmd + Shift + O
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      handleInsertNumberedList();
      return;
    }
    
    // Heading: Ctrl/Cmd + Shift + H
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      handleInsertHeading();
      return;
    }
    
    // Quote: Ctrl/Cmd + Shift + Q
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      handleInsertBlockquote();
      return;
    }
    
    // Link: Ctrl/Cmd + K
    if (isModKey && e.key.toLowerCase() === 'k' && !e.shiftKey) {
      e.preventDefault();
      handleInsertLink();
      return;
    }
    
    // Code block (Python): Ctrl/Cmd + Shift + C
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      handleInsertCodeSnippet('python');
      return;
    }
    
    // Takeaway: Ctrl/Cmd + Shift + T
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      handleAddTakeawayWithUndo();
      return;
    }
    
    // Image: Ctrl/Cmd + Shift + I
    if (isModKey && e.shiftKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleInsertImage();
      return;
    }
  };

  // Global keyboard shortcuts for the editor (when not in textarea)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isModKey = isMac ? e.metaKey : e.ctrlKey;

      // If focus is inside the rich text editor (Quill/contenteditable), let it handle its own shortcuts.
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('.ql-editor') || target?.isContentEditable) return;

      // Skip if editing a bubble or if focus is on main textarea (handled by onKeyDown)
      if (editingId) return;
      if (document.activeElement === inputRef.current) return;

      // Undo: Ctrl/Cmd + Z
      if (isModKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if (isModKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }
      
      // Takeaway: Ctrl/Cmd + Shift + T
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleAddTakeawayWithUndo();
        return;
      }
      
      // Code block (Python): Ctrl/Cmd + Shift + C
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleInsertCodeSnippet('python');
        return;
      }
      
      // Image: Ctrl/Cmd + Shift + I
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        handleInsertImage();
        return;
      }
      
      // Link: Ctrl/Cmd + K
      if (isModKey && e.key.toLowerCase() === 'k' && !e.shiftKey) {
        e.preventDefault();
        handleInsertLink();
        return;
      }
      
      // Bold: Ctrl/Cmd + B (focus textarea first)
      if (isModKey && e.key.toLowerCase() === 'b' && !e.shiftKey) {
        e.preventDefault();
        inputRef.current?.focus();
        handleInsertBold();
        return;
      }
      
      // Italic: Ctrl/Cmd + I (without shift) (focus textarea first)
      if (isModKey && e.key.toLowerCase() === 'i' && !e.shiftKey) {
        e.preventDefault();
        inputRef.current?.focus();
        handleInsertItalic();
        return;
      }
      
      // Inline Code: Ctrl/Cmd + `
      if (isModKey && e.key === '`') {
        e.preventDefault();
        inputRef.current?.focus();
        handleInsertInlineCode();
        return;
      }
      
      // Bullet List: Ctrl/Cmd + Shift + U
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleInsertBulletList();
        return;
      }
      
      // Numbered List: Ctrl/Cmd + Shift + O
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleInsertNumberedList();
        return;
      }
      
      // Heading: Ctrl/Cmd + Shift + H
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleInsertHeading();
        return;
      }
      
      // Quote: Ctrl/Cmd + Shift + Q
      if (isModKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        handleInsertBlockquote();
        return;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editingId, handleUndo, handleRedo, handleAddTakeawayWithUndo]);

  // Insert message at a specific position (after given index)
  // Pass afterIndex = -1 to insert at the very top (before first message)
  const handleInsertMessageAt = (afterIndex: number) => {
    saveToUndoStack();
    const speaker = currentSpeaker === "mentor" ? mentorName : courseCharacter.name;
    const newMsg: ChatMessage = {
      id: generateId(),
      speaker,
      content: "New message...",
      type: "message",
    };
    setMessages((prev) => {
      const updated = [...prev];
      const insertIndex = Math.max(0, Math.min(updated.length, afterIndex + 1));
      updated.splice(insertIndex, 0, newMsg);
      return updated;
    });
    setEditingId(newMsg.id);
    setCurrentSpeaker((prev) => (prev === "mentor" ? "course" : "mentor"));
  };

  // Insert takeaway at a specific position (after given index)
  // Pass afterIndex = -1 to insert at the very top (before first item)
  const handleInsertTakeawayAt = (afterIndex: number) => {
    saveToUndoStack();
    const newTakeaway: ChatMessage = {
      id: generateId(),
      speaker: "TAKEAWAY",
      content: "Enter your takeaway content here...",
      type: "takeaway",
      takeawayTitle: "One-Line Takeaway for Learners",
      takeawayIcon: "🧠",
    };
    setMessages((prev) => {
      const updated = [...prev];
      const insertIndex = Math.max(0, Math.min(updated.length, afterIndex + 1));
      updated.splice(insertIndex, 0, newTakeaway);
      return updated;
    });
    setEditingId(newTakeaway.id);
  };

  // Insert freeform canvas at a specific position
  const handleInsertFreeformAt = (afterIndex: number) => {
    saveToUndoStack();
    const newFreeform: ChatMessage = {
      id: generateId(),
      speaker: "FREEFORM",
      content: "",
      type: "freeform",
      freeformData: undefined,
    };
    setMessages((prev) => {
      const updated = [...prev];
      const insertIndex = Math.max(0, Math.min(updated.length, afterIndex + 1));
      updated.splice(insertIndex, 0, newFreeform);
      return updated;
    });
    setEditingId(newFreeform.id);
  };


  const handleEditMessage = (id: string, content: string, title?: string, icon?: string, freeformData?: FreeformCanvasData) => {
    saveToUndoStack();
    
    // If editing a regular message to empty content, remove it entirely
    const visibleContent = content.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
    
    setMessages((prev) => {
      return prev
        .map((m) => {
          if (m.id === id) {
            if (m.type === "freeform") {
              return { ...m, content, freeformData };
            }
            if (m.type === "takeaway") {
              return { ...m, content, takeawayTitle: title ?? m.takeawayTitle, takeawayIcon: icon ?? m.takeawayIcon };
            }
            return { ...m, content };
          }
          return m;
        })
        // Remove regular messages with no visible content
        .filter((m) => {
          if (m.type === "freeform" || m.type === "takeaway") return true;
          const vc = m.content.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
          return vc.length > 0;
        });
    });
  };

  const handleDeleteMessage = (id: string) => {
    saveToUndoStack();
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  // Convert a regular message to takeaway
  const handleConvertToTakeaway = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === id && m.type !== "takeaway") {
          return {
            ...m,
            speaker: "TAKEAWAY",
            type: "takeaway" as const,
            takeawayTitle: "Key Takeaway",
            takeawayIcon: "🧠",
          };
        }
        return m;
      })
    );
  };

  // Convert a takeaway back to a regular message
  const handleConvertToMessage = (id: string) => {
    const speaker = currentSpeaker === "mentor" ? mentorName : courseCharacter.name;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === id && m.type === "takeaway") {
          return {
            ...m,
            speaker,
            type: "message" as const,
            takeawayTitle: undefined,
            takeawayIcon: undefined,
          };
        }
        return m;
      })
    );
  };

  const handleMoveMessage = (id: string, direction: "up" | "down") => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const newMessages = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newMessages[index], newMessages[swapIndex]] = [newMessages[swapIndex], newMessages[index]];
      return newMessages;
    });
  };

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setMessages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getCharacterForSpeaker = useCallback((speaker: string): CourseCharacter => {
    if (speaker.toLowerCase() === mentorName.toLowerCase()) {
      return {
        ...MENTOR_CHARACTER,
        emoji: mentorIcon,
      };
    }
    // Find matching course by name
    const matchingCourse = courses.find(
      (c) => c.name.toLowerCase() === speaker.toLowerCase()
    );
    if (matchingCourse) {
      return {
        name: matchingCourse.name,
        emoji: matchingCourse.icon || "📚",
        color: "hsl(var(--foreground))",
        bgColor: "hsl(var(--muted))",
      };
    }
    return courseCharacter;
  }, [courses, courseCharacter, mentorIcon]);

  const isMentor = (speaker: string) =>
    speaker.toLowerCase() === mentorName.toLowerCase();

  // Handle text selection for annotations
  const handleTextSelection = useCallback((bubbleIndex?: number) => {
    if (!onTextSelect) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    const range = selection.getRangeAt(0);
    
    // Capture the selection rect immediately
    let rect: { top: number; left: number; width: number; height: number; bottom: number } | undefined;
    const domRect = range.getBoundingClientRect();
    if (domRect && domRect.width > 0 && domRect.height > 0) {
      rect = {
        top: domRect.top,
        left: domRect.left,
        width: domRect.width,
        height: domRect.height,
        bottom: domRect.bottom,
      };
    }
    
    onTextSelect({
      start: range.startOffset,
      end: range.endOffset,
      text,
      type: "conversation",
      bubbleIndex,
      rect,
    });
  }, [onTextSelect]);

  // Handle annotating a full bubble
  const handleAnnotateBubble = useCallback((bubbleIndex: number, text: string) => {
    if (!onTextSelect) return;
    if (!text || text.length < 2) return;

    // For full bubble annotation, we don't have a specific selection rect
    // The popup will try to use the window selection as fallback
    onTextSelect({
      start: 0,
      end: text.length,
      text: text.trim(),
      type: "conversation",
      bubbleIndex,
    });
  }, [onTextSelect]);

  return (
    <div className="chat-style-editor rounded-xl border border-border bg-background overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">Chat Editor</span>
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.slug} value={course.slug}>
                  <span className="flex items-center gap-2">
                    {renderCourseIcon(course.icon, 14)}
                    <span>{course.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "edit" | "preview")}>
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="text-xs px-3 h-7">
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-3 h-7">
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Chat container */}
      <div
        ref={chatContainerRef}
        className={cn(
          "p-6 overflow-y-auto bg-gradient-to-b from-background to-muted/20",
          "min-h-[450px] max-h-[600px]"
        )}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 0%, transparent 70%)`,
        }}
        onMouseUp={() => handleTextSelection()}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Start a conversation</p>
            <p className="text-xs mt-1 opacity-70">
              Type as {courseCharacter.name} or {mentorName}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={messages.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0">
                {/* Insert at top (before first message) */}
                {mode === "edit" && messages.length > 0 && (
                  <InsertBetweenButton
                    onInsertMessage={() => handleInsertMessageAt(-1)}
                    onInsertTakeaway={() => handleInsertTakeawayAt(-1)}
                    onInsertFreeform={() => handleInsertFreeformAt(-1)}
                    courseCharacterName={courseCharacter.name}
                    mentorName={mentorName}
                  />
                )}

                {messages.map((message, index) => {
                   const bubbleHasOpenAnnotations = annotations.some(
                    a => a.bubble_index === index && a.status === "open"
                  );
                  return (
                  <div key={message.id}>
                    <SortableMessageItem
                      message={message}
                      character={getCharacterForSpeaker(message.speaker)}
                      isMentor={isMentor(message.speaker)}
                      isEditing={editingId === message.id}
                      onEdit={handleEditMessage}
                      onStartEdit={setEditingId}
                      onEndEdit={() => setEditingId(null)}
                      onDelete={handleDeleteMessage}
                      onMoveUp={() => handleMoveMessage(message.id, "up")}
                      onMoveDown={() => handleMoveMessage(message.id, "down")}
                      onConvertToTakeaway={handleConvertToTakeaway}
                      onConvertToMessage={handleConvertToMessage}
                      onAnnotateBubble={handleAnnotateBubble}
                      isEditMode={mode === "edit"}
                      isFirst={index === 0}
                      isLast={index === messages.length - 1}
                      codeTheme={codeTheme}
                      index={index}
                      annotationMode={annotationMode}
                      hasOpenAnnotations={bubbleHasOpenAnnotations}
                    />
                    {/* Insert between button - show after every bubble in edit mode */}
                    {mode === "edit" && (
                      <InsertBetweenButton
                        onInsertMessage={() => handleInsertMessageAt(index)}
                        onInsertTakeaway={() => handleInsertTakeawayAt(index)}
                        onInsertFreeform={() => handleInsertFreeformAt(index)}
                        courseCharacterName={courseCharacter.name}
                        mentorName={mentorName}
                      />
                    )}
                  </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Input area (only in edit mode and not in annotation mode) */}
      {mode === "edit" && !annotationMode && (
        <div className="border-t border-border bg-muted/30 p-4">
          {/* Speaker toggle with icon pickers and view mode toggle */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Speaking as:</span>
              <div className="flex items-center gap-1">
                {/* Course character toggle */}
                <div className="flex items-center rounded-full bg-muted p-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                          currentSpeaker === "course"
                            ? "bg-slate-200 dark:bg-slate-700 shadow-sm"
                            : "hover:bg-muted-foreground/10"
                        )}
                      >
                        {renderCourseIcon(courseCharacter.emoji, 16)}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border border-border shadow-lg z-50">
                      <div className="p-2 text-xs text-muted-foreground mb-1">Course icon is set in course settings</div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    onClick={() => setCurrentSpeaker("course")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      currentSpeaker === "course"
                        ? "bg-slate-200 dark:bg-slate-700 shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {courseCharacter.name}
                  </button>
                </div>

                {/* Mentor toggle */}
                <div className="flex items-center rounded-full bg-muted p-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                          currentSpeaker === "mentor"
                            ? "bg-emerald-500 shadow-sm"
                            : "hover:bg-muted-foreground/10"
                        )}
                      >
                        <span className="text-sm">{mentorIcon}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border border-border shadow-lg z-50">
                      <div className="grid grid-cols-4 gap-1 p-2">
                        {CHARACTER_ICONS.map((icon) => (
                          <DropdownMenuItem
                            key={icon}
                            onClick={() => setMentorIcon(icon)}
                            className={cn(
                              "cursor-pointer justify-center text-xl p-2 rounded-lg",
                              mentorIcon === icon && "bg-emerald-100 dark:bg-emerald-900/50"
                            )}
                          >
                            {icon}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    onClick={() => setCurrentSpeaker("mentor")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      currentSpeaker === "mentor"
                        ? "bg-emerald-500 shadow-sm text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mentorName}
                  </button>
                </div>
              </div>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleComposerViewModeChange('edit')}
                className={cn(
                  "h-6 px-2 text-xs gap-1",
                  composerViewMode === 'edit' && "bg-muted"
                )}
              >
                <EyeOff className="w-3 h-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleComposerViewModeChange('split')}
                className={cn(
                  "h-6 px-2 text-xs gap-1",
                  composerViewMode === 'split' && "bg-muted"
                )}
              >
                <Columns className="w-3 h-3" />
                Split View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleComposerViewModeChange('preview')}
                className={cn(
                  "h-6 px-2 text-xs gap-1",
                  composerViewMode === 'preview' && "bg-muted"
                )}
              >
                <Eye className="w-3 h-3" />
                Preview
              </Button>
            </div>
          </div>

          {/* Message input with view modes */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              {composerViewMode === 'split' ? (
                <div className="relative">
                  <ResizablePanelGroup
                    direction="horizontal"
                    className="rounded-2xl border border-border bg-background transition-all duration-200"
                    style={{ height: `${splitViewHeight}px` }}
                    onLayout={handleSplitPanelResize}
                  >
                    <ResizablePanel defaultSize={splitPanelSizes[0]} minSize={20} maxSize={80}>
                      <textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        onMouseUp={handleTextareaMouseUp}
                        placeholder={`Type a message as ${
                          currentSpeaker === "mentor" ? mentorName : courseCharacter.name
                        }...`}
                        className="w-full h-full px-4 py-3 pr-10 text-sm font-mono bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/60"
                      />
                    </ResizablePanel>
                    <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />
                    <ResizablePanel defaultSize={splitPanelSizes[1]} minSize={20} maxSize={80}>
                      <div className="h-full px-4 py-3 overflow-y-auto text-sm prose prose-sm dark:prose-invert max-w-none bg-muted/20 relative">
                        {newMessage ? (
                          <ComposerPreview content={newMessage} codeTheme={codeTheme} />
                        ) : (
                          <span className="text-muted-foreground/60 italic">Preview will appear here...</span>
                        )}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>

                  {/* Bottom bar with shortcuts */}
                  <div className="absolute bottom-2 left-4 z-50">
                    <div className="text-[10px] text-muted-foreground/50">
                      Enter send • {modKey}+B bold • {modKey}+I italic • {modKey}+` code • {modKey}+⇧+U bullets
                    </div>
                  </div>
                  {/* Draggable resize handle at bottom right corner */}
                  <div
                    className="absolute bottom-0 right-0 cursor-nwse-resize opacity-40 hover:opacity-70 transition-opacity z-50 p-1.5 select-none"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      splitViewDragRef.current = { startY: e.clientY, startHeight: splitViewHeight };
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        if (!splitViewDragRef.current) return;
                        const deltaY = moveEvent.clientY - splitViewDragRef.current.startY;
                        const newHeight = Math.max(80, Math.min(600, splitViewDragRef.current.startHeight + deltaY));
                        setSplitViewHeight(newHeight);
                      };
                      
                      const handleMouseUp = () => {
                        splitViewDragRef.current = null;
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    title="Drag to resize"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" className="text-muted-foreground">
                      <path
                        d="M10 2L2 10M10 6L6 10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              ) : composerViewMode === 'preview' ? (
                <div 
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background min-h-[120px] text-sm prose prose-sm dark:prose-invert max-w-none cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => handleComposerViewModeChange('edit')}
                  title="Click to edit"
                >
                  {newMessage ? (
                    <ComposerPreview content={newMessage} codeTheme={codeTheme} />
                  ) : (
                    <span className="text-muted-foreground/60 italic">Click to start typing...</span>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      onMouseUp={handleTextareaMouseUp}
                      placeholder={`Type a message as ${
                        currentSpeaker === "mentor" ? mentorName : courseCharacter.name
                      }...`}
                      className={cn(
                        "w-full px-4 py-3 pr-10 rounded-2xl border border-border bg-background",
                        "resize-y text-sm overflow-y-auto transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                        "placeholder:text-muted-foreground/60",
                        isComposerExpanded ? "min-h-[200px] max-h-[600px]" : "min-h-[80px] max-h-[400px]"
                      )}
                      style={manualHeight ? { height: `${manualHeight}px` } : undefined}
                      rows={isComposerExpanded ? 8 : 3}
                    />
                    {/* Expand/collapse button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsComposerExpanded(!isComposerExpanded)}
                      className="absolute top-2 right-2 h-6 w-6 opacity-60 hover:opacity-100 text-muted-foreground"
                      title={isComposerExpanded ? "Collapse" : "Expand"}
                    >
                      {isComposerExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-4 text-[10px] text-muted-foreground/50">
                    Enter send • {modKey}+B bold • {modKey}+I italic • {modKey}+` code • {modKey}+⇧+U bullets
                  </div>
                </>
              )}
            </div>
            
            {/* Insert options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 w-12 rounded-full p-0 shadow-md",
                    "border-border hover:bg-muted",
                    "transition-all duration-200 hover:scale-105"
                  )}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50">
                {/* Undo/Redo */}
                <DropdownMenuItem 
                  onClick={handleUndo} 
                  disabled={undoStack.length === 0}
                  className="cursor-pointer"
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  Undo
                  <DropdownMenuShortcut>{modKey}+Z</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleRedo} 
                  disabled={redoStack.length === 0}
                  className="cursor-pointer"
                >
                  <Redo2 className="w-4 h-4 mr-2" />
                  Redo
                  <DropdownMenuShortcut>{modKey}+⇧+Z</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Code className="w-4 h-4 mr-2" />
                    Code Block
                    <DropdownMenuShortcut>{modKey}+⇧+C</DropdownMenuShortcut>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="bg-popover border border-border shadow-lg z-50">
                      {CODE_LANGUAGES.map((lang, index) => (
                        <DropdownMenuItem
                          key={lang.value}
                          onClick={() => handleInsertCodeSnippet(lang.value)}
                          className="cursor-pointer"
                        >
                          {lang.label}
                          {index === 0 && <DropdownMenuShortcut>{modKey}+⇧+C</DropdownMenuShortcut>}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddTakeawayWithUndo} className="cursor-pointer">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Takeaway Block
                  <DropdownMenuShortcut>{modKey}+⇧+T</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleInsertImage} className="cursor-pointer">
                  <Image className="w-4 h-4 mr-2" />
                  Image
                  <DropdownMenuShortcut>{modKey}+⇧+I</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertLink} className="cursor-pointer">
                  <Link className="w-4 h-4 mr-2" />
                  Link
                  <DropdownMenuShortcut>{modKey}+K</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertBold} className="cursor-pointer">
                  <Bold className="w-4 h-4 mr-2" />
                  Bold Text
                  <DropdownMenuShortcut>{modKey}+B</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertItalic} className="cursor-pointer">
                  <Italic className="w-4 h-4 mr-2" />
                  Italic Text
                  <DropdownMenuShortcut>{modKey}+I</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertInlineCode} className="cursor-pointer">
                  <Terminal className="w-4 h-4 mr-2" />
                  Inline Code
                  <DropdownMenuShortcut>{modKey}+`</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertBulletList} className="cursor-pointer">
                  <List className="w-4 h-4 mr-2" />
                  Bullet List
                  <DropdownMenuShortcut>{modKey}+⇧+U</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertNumberedList} className="cursor-pointer">
                  <ListOrdered className="w-4 h-4 mr-2" />
                  Numbered List
                  <DropdownMenuShortcut>{modKey}+⇧+O</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertHeading} className="cursor-pointer">
                  <Heading2 className="w-4 h-4 mr-2" />
                  Heading
                  <DropdownMenuShortcut>{modKey}+⇧+H</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInsertBlockquote} className="cursor-pointer">
                  <Quote className="w-4 h-4 mr-2" />
                  Blockquote
                  <DropdownMenuShortcut>{modKey}+⇧+Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Send button */}
            <Button
              onClick={handleAddMessage}
              disabled={!newMessage.trim()}
              className={cn(
                "h-12 w-12 rounded-full p-0 shadow-lg",
                "bg-[hsl(210,100%,52%)] hover:bg-[hsl(210,100%,45%)]",
                "transition-all duration-200 hover:scale-105"
              )}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Explanation section */}
      <div className="border-t border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Explanation (appears after chat)</span>
        </div>
        {mode === "edit" ? (
          <RichTextEditor
            value={explanation}
            onChange={setExplanation}
            placeholder="Add an explanation or summary of the conversation... (optional)"
            annotationMode={annotationMode}
            annotations={explanationAnnotations}
            isAdmin={isAdmin}
            isModerator={isModerator}
            onAnnotationResolve={onAnnotationResolve}
            onAnnotationDismiss={onAnnotationDismiss}
            onAnnotationDelete={onAnnotationDelete}
            onTextSelect={onExplanationTextSelect}
          />
        ) : (
          <RichTextEditor
            value={explanation}
            onChange={() => {}}
            readOnly
            annotations={explanationAnnotations}
            isAdmin={isAdmin}
            isModerator={isModerator}
            onAnnotationResolve={onAnnotationResolve}
            onAnnotationDismiss={onAnnotationDismiss}
            onAnnotationDelete={onAnnotationDelete}
          />
        )}
        <p className="text-xs text-muted-foreground mt-2">
          This text will appear below the chat conversation as an explanation section.
        </p>
      </div>

      <style>{`
        .chat-style-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default ChatStyleEditor;
