import { useState, useRef, useEffect, useCallback } from "react";
import { FloatingTextToolbar } from "@/components/ui/FloatingTextToolbar";
import { toast } from "sonner";
import { ChatMessage, CourseCharacter, MENTOR_CHARACTER, TAKEAWAY_ICONS } from "./types";
import ChatBubble from "./ChatBubble";
import TakeawayBlock from "./TakeawayBlock";
import { FreeformBlock } from "./FreeformBlock";
import { FreeformCanvasData } from "./freeform";
import { cn } from "@/lib/utils";
import { extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { Button } from "@/components/ui/button";
import { RichTextEditor, LightEditor, type LightEditorRef } from "@/components/tiptap";
import ChatConversationView from "./ChatConversationView";
import { Plus, Eye, Edit3, MessageCircle, Trash2, FileText, Send, GripVertical, Pencil, ArrowUp, ArrowDown, Undo2, Redo2, EyeOff, Columns, MessageSquarePlus, Copy } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { MonacoCodeBlock } from "@/components/code-block";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  lessonLabel?: string;
  annotationMode?: boolean;
  annotations?: BubbleAnnotation[];
  /** Hide the explanation section below the chat (default true) */
  showExplanation?: boolean;
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
  courseCharacterName: string;
  mentorName: string;
}

const InsertBetweenButton = ({
  onInsertMessage,
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
  isFirstInRun?: boolean;
  isLastInRun?: boolean;
  codeTheme?: string;
  index?: number;
  annotationMode?: boolean;
  hasOpenAnnotations?: boolean;
}

/** Shared rendering logic for a message item — no dnd state here */
const MessageItemContent = ({
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
  isFirstInRun = true,
  isLastInRun = true,
  codeTheme,
  index = 0,
  annotationMode,
  hasOpenAnnotations,
  // dnd props — undefined when used without DnD
  nodeRef,
  dragStyle,
  dragAttributes,
  dragListeners,
}: MessageItemProps & {
  nodeRef?: (node: HTMLDivElement | null) => void;
  dragStyle?: React.CSSProperties;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}) => {
  const [showActions, setShowActions] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHoverEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowActions(true);
  };
  const handleHoverLeave = () => {
    hideTimerRef.current = setTimeout(() => setShowActions(false), 150);
  };

  const isTakeaway = message.type === "takeaway";
  const isFreeform = message.type === "freeform";

  // Action buttons component
  const ActionButtons = () => (
    <div
      className={cn(
        "flex items-center gap-0.5 bg-background/95 backdrop-blur-sm border rounded-lg px-1 py-1 shadow-sm",
        isMentor ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 cursor-grab active:cursor-grabbing"
        {...(dragAttributes as any)}
        {...(dragListeners as any)}
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
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => {
          navigator.clipboard.writeText(message.content);
          toast.success("Copied to clipboard");
        }}
        title="Copy content"
      >
        <Copy className="w-3 h-3" />
      </Button>
      {isTakeaway && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onConvertToMessage(message.id)}
          title="Convert to message"
        >
          <MessageCircle className="w-3 h-3" />
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
      <div ref={nodeRef} style={dragStyle}>
        <FreeformBlock
          message={message}
          isEditing={isEditing}
          isEditMode={isEditMode}
          onEdit={(id, content, freeformData) => onEdit(id, content, undefined, undefined, freeformData)}
          onStartEdit={annotationMode ? () => { } : onStartEdit}
          onEndEdit={onEndEdit}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          isFirst={isFirst}
          isLast={isLast}
          dragHandleProps={{ ...(dragAttributes as any), ...(dragListeners as any) }}
          annotationMode={annotationMode}
        />
      </div>
    );
  }

  // For takeaway blocks, always show action buttons on the right
  if (isTakeaway) {
    return (
      <div ref={nodeRef} style={dragStyle} className="group relative flex items-start gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <TakeawayBlock
            message={message}
            isEditing={isEditing}
            onEdit={onEdit}
            onStartEdit={annotationMode ? () => { } : onStartEdit}
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

  // For regular messages, avatar lives in a shared hover container with ActionButtons
  // so the mouse can move between them without triggering hide (no gap, no layout shift)
  return (
    <div
      ref={nodeRef}
      style={dragStyle}
      className={cn(
        "flex items-end gap-2",
        isLastInRun ? "mb-4" : "mb-1",
        isMentor ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Shared hover container: avatar + absolutely-positioned ActionButtons */}
      <div
        className="relative flex-shrink-0"
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
        {/* Avatar — only shown on the last bubble in a consecutive run */}
        {isLastInRun ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold cursor-pointer select-none"
            style={
              isMentor
                ? { backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#3F5C50" }
                : { backgroundColor: "#E8F0EC", color: "#5E7068" }
            }
          >
            {isMentor ? "K" : character.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
        ) : (
          /* Invisible spacer keeps bubble alignment consistent */
          <div className="w-8 h-8 flex-shrink-0" />
        )}

        {/* ActionButtons — absolute, positioned above avatar, debounce keeps it open as mouse moves to it */}
        {isEditMode && !isEditing && !annotationMode && showActions && (
          <div
            className={cn(
              "absolute z-20 top-full mt-1",
              isMentor ? "right-0" : "left-0"
            )}
            onMouseEnter={handleHoverEnter}
            onMouseLeave={handleHoverLeave}
          >
            <ActionButtons />
          </div>
        )}
      </div>

      {/* Bubble content */}
      <div className="flex-1 min-w-0">
        <ChatBubble
          message={message}
          character={character}
          isMentor={isMentor}
          isEditing={isEditing}
          onEdit={onEdit}
          onStartEdit={annotationMode ? () => { } : onStartEdit}
          onEndEdit={onEndEdit}
          codeTheme={codeTheme}
          hasOpenAnnotations={hasOpenAnnotations}
          annotationMode={annotationMode}
          showSpeakerName={isFirstInRun}
        />
      </div>
    </div>
  );
};

/** Wrapper with dnd-kit sortable behaviour */
const SortableMessageItem = (props: MessageItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.message.id });
  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <MessageItemContent
      {...props}
      nodeRef={setNodeRef}
      dragStyle={dragStyle}
      dragAttributes={attributes as any}
      dragListeners={listeners as any}
    />
  );
};

/** Wrapper without dnd — used in annotation mode so pointer events aren't captured */
const PlainMessageItem = (props: MessageItemProps) => (
  <MessageItemContent {...props} dragStyle={{}} />
);

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
  showExplanation = true,
  explanationAnnotations = [],
  isAdmin = false,
  isModerator = false,
  onAnnotationResolve,
  onAnnotationDismiss,
  onAnnotationDelete,
  onTextSelect,
  onExplanationTextSelect,
  lessonLabel,
}: ChatStyleEditorProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => parseContent(value));
  const [explanation, setExplanation] = useState<string>(() => extractExplanation(value) || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [composerEditorValue, setComposerEditorValue] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<"mentor" | "course">("mentor");

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<ChatMessage[][]>([]);
  const [redoStack, setRedoStack] = useState<ChatMessage[][]>([]);
  const [selectedCourse, setSelectedCourse] = useState(courseType);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [courses, setCourses] = useState<Course[]>([]);
  const normalizeCourseKey = useCallback((value: string) => {
    return value.toLowerCase().replace(/[\s_-]+/g, "");
  }, []);
  const [manualHeight, setManualHeight] = useState<number | null>(null);
  const splitViewHeight = 120; // Fixed height for split view
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
        } catch { }
      }
    }
    return [50, 50];
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerEditorRef = useRef<LightEditorRef>(null);
  const mentorName = "Karan";

  // Auto-scroll to bottom only in edit mode (new message was added).
  // In annotation mode, start at the top so reviewers can read from the beginning.
  useEffect(() => {
    if (annotationMode) return;
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, annotationMode]);

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
        if (
          data.length > 0 &&
          !data.find(
            (c) =>
              c.slug === selectedCourse ||
              normalizeCourseKey(c.slug) === normalizeCourseKey(selectedCourse) ||
              normalizeCourseKey(c.name) === normalizeCourseKey(selectedCourse)
          )
        ) {
          setSelectedCourse(data[0].slug);
        }
      }
    };
    fetchCourses();
  }, [normalizeCourseKey, selectedCourse]);

  // Sync selectedCourse with courseType prop when it changes
  useEffect(() => {
    if (courseType && courses.length > 0) {
      // Find matching course by slug or name
      const matchingCourse = courses.find((c) => {
        const slugKey = normalizeCourseKey(c.slug);
        const nameKey = normalizeCourseKey(c.name);
        const typeKey = normalizeCourseKey(courseType);
        return c.slug === courseType || slugKey === typeKey || nameKey === typeKey;
      });
      if (matchingCourse) {
        setSelectedCourse(matchingCourse.slug);
      }
    }
  }, [courseType, courses, normalizeCourseKey]);

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
    // In default edit mode the composer is a LightEditor (TipTap).
    // Insert triple-backtick markdown as plain text paragraphs so the bubble
    // renderer picks it up and renders it as a code block when sent.
    if (composerViewMode === 'edit') {
      const editor = composerEditorRef.current?.getEditor();
      if (editor) {
        editor.chain().focus().insertContent([
          { type: 'paragraph', content: [{ type: 'text', text: `\`\`\`${language}` }] },
          { type: 'paragraph', content: [{ type: 'text', text: '# Your code here' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '```' }] },
        ]).run();
        return;
      }
    }
    // Fallback for split/preview modes — markdown insertion into textarea.
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
  // Convert TipTap JSON doc → markdown string so all existing renderers
  // (ChatBubble, version history, comparison pages) work without changes.
  const tiptapJsonToMarkdown = (json: any): string => {
    if (!json) return '';

    const inlineToMd = (node: any): string => {
      if (node.type === 'hardBreak') return '\n';
      let text = node.text || (node.content ? node.content.map(inlineToMd).join('') : '');
      for (const mark of (node.marks || [])) {
        if (mark.type === 'bold') text = `**${text}**`;
        else if (mark.type === 'italic') text = `*${text}*`;
        else if (mark.type === 'code') text = `\`${text}\``;
        else if (mark.type === 'link') text = `[${text}](${mark.attrs?.href || ''})`;
      }
      return text;
    };

    const nodeToMd = (node: any): string => {
      switch (node.type) {
        case 'doc':
          return (node.content || []).map(nodeToMd).join('\n');
        case 'paragraph':
          return (node.content || []).map(inlineToMd).join('');
        case 'heading': {
          const level = node.attrs?.level || 2;
          return '#'.repeat(level) + ' ' + (node.content || []).map(inlineToMd).join('');
        }
        case 'bulletList':
          return (node.content || []).map((item: any) =>
            `• ${(item.content || []).map(nodeToMd).join('')}`
          ).join('\n');
        case 'orderedList':
          return (node.content || []).map((item: any, i: number) =>
            `${i + 1}. ${(item.content || []).map(nodeToMd).join('')}`
          ).join('\n');
        case 'blockquote':
          return (node.content || []).map(nodeToMd).join('\n')
            .split('\n').map((l: string) => `> ${l}`).join('\n');
        case 'codeBlock': {
          const lang = node.attrs?.language || '';
          const code = (node.content || []).map((n: any) => n.text || '').join('');
          return `\`\`\`${lang}\n${code}\n\`\`\``;
        }
        case 'executableCodeBlock': {
          const lang = node.attrs?.language || '';
          const code = node.attrs?.code || (node.content || []).map((n: any) => n.text || '').join('');
          return `\`\`\`${lang}\n${code}\n\`\`\``;
        }
        case 'hardBreak':
          return '\n';
        default:
          return (node.content || []).map(nodeToMd).join('');
      }
    };

    return nodeToMd(json).trim();
  };

  // Reset manual height when message is sent
  const handleAddMessage = useCallback(() => {
    // Edit and Split modes both use LightEditor (composerEditorRef).
    // Preview mode falls back to the raw newMessage textarea value.
    const isLightEditorMode = composerViewMode === 'edit' || composerViewMode === 'split';
    const contentToSend = isLightEditorMode
      ? (() => {
          const editor = composerEditorRef.current?.getEditor();
          if (!editor || editor.isEmpty) return null;
          return tiptapJsonToMarkdown(editor.getJSON()) || null;
        })()
      : newMessage.trim() || null;

    if (!contentToSend) return;

    saveToUndoStack();
    const speaker = currentSpeaker === "mentor" ? mentorName : courseCharacter.name;
    const newMsg: ChatMessage = {
      id: generateId(),
      speaker,
      content: contentToSend,
      type: "message",
    };

    setMessages((prev) => [...prev, newMsg]);

    if (isLightEditorMode) {
      setComposerEditorValue("");
      composerEditorRef.current?.clear();
    } else {
      setNewMessage("");
    }
    setManualHeight(null);
    setCurrentSpeaker((prev) => (prev === "mentor" ? "course" : "mentor"));

    if (isLightEditorMode) {
      composerEditorRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [newMessage, composerViewMode, currentSpeaker, courseCharacter.name, saveToUndoStack]);

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

  // Global keyboard shortcuts for the editor (when not in textarea)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isModKey = isMac ? e.metaKey : e.ctrlKey;

      // If focus is inside any editable surface, let that editor handle its own shortcuts.
      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;
      const targetIsEditable =
        !!target?.closest?.('.ql-editor, .ProseMirror, input, textarea, select, [contenteditable="true"]') ||
        !!target?.isContentEditable;
      const activeIsEditable =
        !!activeEl?.closest?.('.ql-editor, .ProseMirror, input, textarea, select, [contenteditable="true"]') ||
        !!activeEl?.isContentEditable;
      if (targetIsEditable || activeIsEditable) return;

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
      content: "",
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
      return MENTOR_CHARACTER;
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
  }, [courses, courseCharacter]);

  const isMentor = (speaker: string) =>
    speaker.toLowerCase() === mentorName.toLowerCase();

  // Handle text selection for annotations — only active in annotation mode
  const handleTextSelection = useCallback((bubbleIndex?: number) => {
    if (!annotationMode || !onTextSelect) return;

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
  }, [annotationMode, onTextSelect]);

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
    <div className="chat-style-editor rounded-xl border border-border bg-background overflow-hidden shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border/60">
        <div className="flex items-center gap-2">
          {lessonLabel ? (
            <span className="text-sm font-medium text-foreground">{lessonLabel}</span>
          ) : (
            <span className="text-sm text-muted-foreground italic">No lesson selected</span>
          )}
        </div>

        <div className="flex items-center p-[3px] bg-muted/60 rounded-lg border border-border/50 gap-[2px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
          {([
            { value: "edit" as const, icon: Edit3, label: "Edit" },
            { value: "preview" as const, icon: Eye, label: "Preview" },
          ]).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 select-none",
                mode === value
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/30"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              <Icon className="w-3 h-3 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat container */}
      {/* In annotation mode: no fixed height — messages expand naturally so the outer
          canvas scroll handles navigation (avoids nested-scroll ambiguity where the
          inner 420px scroll container competes with the outer canvas for wheel events,
          and messages rendered without InsertBetweenButtons pack too tightly to overflow).
          In edit mode: fixed 420px height keeps the block compact. */}
      {/* Preview mode — exact CourseDetail rendering */}
      {mode === "preview" && !annotationMode && (
        <div className="overflow-y-auto" style={{ height: 420 }}>
          <ChatConversationView
            content={serializeMessages(messages, explanation)}
            courseType={selectedCourse}
            showHeader={false}
            className="px-6 py-6"
            allowSingleSpeaker
          />
        </div>
      )}

      <div
        ref={chatContainerRef}
        className={cn(
          "bg-[#FAFAFA] dark:bg-background",
          mode === "preview" && !annotationMode ? "hidden" : "",
          mode !== "preview" && "p-6",
          !annotationMode && "overflow-y-auto"
        )}
        style={{ ...(annotationMode ? {} : { height: 420 }) }}
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
        ) : annotationMode ? (
          // In annotation mode: no DnD context so pointer events don't get captured,
          // allowing native scroll to work inside the chat container.
          <div className="space-y-0">
            {messages.map((message, index) => {
              const bubbleHasOpenAnnotations = annotations.some(
                a => a.bubble_index === index && a.status === "open"
              );
              const isFirstInRun = index === 0 || messages[index - 1].speaker !== message.speaker;
              const isLastInRun = index === messages.length - 1 || messages[index + 1].speaker !== message.speaker;
              return (
                <div key={message.id}>
                  <PlainMessageItem
                    message={message}
                    character={getCharacterForSpeaker(message.speaker)}
                    isMentor={isMentor(message.speaker)}
                    isEditing={false}
                    onEdit={handleEditMessage}
                    onStartEdit={setEditingId}
                    onEndEdit={() => setEditingId(null)}
                    onDelete={handleDeleteMessage}
                    onMoveUp={() => handleMoveMessage(message.id, "up")}
                    onMoveDown={() => handleMoveMessage(message.id, "down")}
                    onConvertToTakeaway={handleConvertToTakeaway}
                    onConvertToMessage={handleConvertToMessage}
                    onAnnotateBubble={handleAnnotateBubble}
                    isEditMode={false}
                    isFirst={index === 0}
                    isLast={index === messages.length - 1}
                    isFirstInRun={isFirstInRun}
                    isLastInRun={isLastInRun}
                    codeTheme={codeTheme}
                    index={index}
                    annotationMode={true}
                    hasOpenAnnotations={bubbleHasOpenAnnotations}
                  />
                </div>
              );
            })}
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
                    courseCharacterName={courseCharacter.name}
                    mentorName={mentorName}
                  />
                )}

                {messages.map((message, index) => {
                  const bubbleHasOpenAnnotations = annotations.some(
                    a => a.bubble_index === index && a.status === "open"
                  );
                  const isFirstInRun = index === 0 || messages[index - 1].speaker !== message.speaker;
                  const isLastInRun = index === messages.length - 1 || messages[index + 1].speaker !== message.speaker;
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
                        isFirstInRun={isFirstInRun}
                        isLastInRun={isLastInRun}
                        codeTheme={codeTheme}
                        index={index}
                        annotationMode={false}
                        hasOpenAnnotations={bubbleHasOpenAnnotations}
                      />
                      {/* Insert between button - show after every bubble in edit mode */}
                      {mode === "edit" && (
                        <InsertBetweenButton
                          onInsertMessage={() => handleInsertMessageAt(index)}
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
        )
        }
      </div>

      {/* Input area (only in edit mode and not in annotation mode) */}
      {mode === "edit" && !annotationMode && (
        <div className="border-t border-border bg-muted/30 p-4 flex-shrink-0">
          {/* Composer header: speaker toggle + view mode */}
          <div className="flex items-center justify-between gap-3 mb-3">
            {/* Speaking as — compact segmented pill */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground/60 whitespace-nowrap shrink-0">
                Speaking as
              </span>
              <div className="flex items-center p-0.5 bg-muted/70 rounded-full border border-border/40 gap-0.5">
                {/* Course pill */}
                <button
                  onClick={() => setCurrentSpeaker("course")}
                  className={cn(
                    "flex items-center gap-1.5 pl-1 pr-3 py-0.5 rounded-full text-xs font-medium transition-all duration-150 select-none",
                    currentSpeaker === "course"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                    currentSpeaker === "course"
                      ? "bg-neutral-300 dark:bg-neutral-800 text-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {courseCharacter.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate max-w-[80px]">{courseCharacter.name}</span>
                </button>

                {/* Karan pill */}
                <button
                  onClick={() => setCurrentSpeaker("mentor")}
                  className={cn(
                    "flex items-center gap-1.5 pl-1 pr-3 py-0.5 rounded-full text-xs font-medium transition-all duration-150 select-none",
                    currentSpeaker === "mentor"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                    currentSpeaker === "mentor"
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    K
                  </span>
                  {mentorName}
                </button>
              </div>
            </div>

            {/* View mode — segmented control */}
            <div className="flex items-center p-0.5 bg-muted/70 rounded-lg border border-border/40 gap-0.5 shrink-0">
              {([
                { mode: 'edit' as const, icon: EyeOff, label: 'Edit' },
                { mode: 'split' as const, icon: Columns, label: 'Split' },
                { mode: 'preview' as const, icon: Eye, label: 'Preview' },
              ] as const).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => handleComposerViewModeChange(mode)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 select-none",
                    composerViewMode === mode
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  {label}
                </button>
              ))}
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
                      <div className="h-full overflow-y-auto">
                        <LightEditor
                          ref={composerEditorRef}
                          value={composerEditorValue}
                          onChange={setComposerEditorValue}
                          placeholder={`Type a message as ${currentSpeaker === "mentor" ? mentorName : courseCharacter.name}…`}
                          characterLimit={2000}
                          showCharCount={false}
                          minHeight="80px"
                          onEnterSubmit={handleAddMessage}
                          extendedToolbar
                          className="rounded-none border-0 border-r border-border h-full"
                          startToolbarActions={
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="sm"
                                    className="h-7 w-7 p-0 disabled:opacity-30"
                                    onClick={handleUndo} disabled={undoStack.length === 0}
                                  >
                                    <Undo2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Undo ({modKey}+Z)</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="sm"
                                    className="h-7 w-7 p-0 disabled:opacity-30"
                                    onClick={handleRedo} disabled={redoStack.length === 0}
                                  >
                                    <Redo2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Redo ({modKey}+⇧+Z)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          }
                        />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-colors" />
                    <ResizablePanel defaultSize={splitPanelSizes[1]} minSize={20} maxSize={80}>
                      <div className="h-full px-4 py-3 overflow-y-auto text-sm prose prose-sm dark:prose-invert max-w-none bg-muted/20 relative">
                        {composerEditorValue ? (
                          <ComposerPreview
                            content={(() => {
                              try { return tiptapJsonToMarkdown(JSON.parse(composerEditorValue)); }
                              catch { return composerEditorValue; }
                            })()}
                            codeTheme={codeTheme}
                          />
                        ) : (
                          <span className="text-muted-foreground/60 italic">Preview will appear here...</span>
                        )}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>

                </div>
              ) : composerViewMode === 'preview' ? (
                <div
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background min-h-[120px] text-sm prose prose-sm dark:prose-invert max-w-none cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => handleComposerViewModeChange('edit')}
                  title="Click to edit"
                >
                  {composerEditorValue ? (
                    <ComposerPreview
                      content={(() => {
                        try { return tiptapJsonToMarkdown(JSON.parse(composerEditorValue)); }
                        catch { return composerEditorValue; }
                      })()}
                      codeTheme={codeTheme}
                    />
                  ) : (
                    <span className="text-muted-foreground/60 italic">Click to start typing...</span>
                  )}
                </div>
              ) : (
                <LightEditor
                  ref={composerEditorRef}
                  value={composerEditorValue}
                  onChange={setComposerEditorValue}
                  placeholder={`Type a message as ${currentSpeaker === "mentor" ? mentorName : courseCharacter.name}…`}
                  characterLimit={2000}
                  showCharCount={false}
                  minHeight="80px"
                  onEnterSubmit={handleAddMessage}
                  extendedToolbar
                  className="rounded-2xl"
                  startToolbarActions={
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 disabled:opacity-30"
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Undo ({modKey}+Z)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 disabled:opacity-30"
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                          >
                            <Redo2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Redo ({modKey}+⇧+Z)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  }
                />
              )}
            </div>

            {/* Insert Code Block — hidden in annotation mode */}
            {!annotationMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-12 w-12 rounded-full p-0",
                      "text-muted-foreground hover:text-foreground hover:bg-muted",
                      "border border-border/60 hover:border-border",
                      "transition-all duration-150"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50 p-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-2">
                    Insert Code Block
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {CODE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => handleInsertCodeSnippet(lang.value)}
                        className={cn(
                          "w-full h-8 px-2 rounded-md text-xs font-medium text-center",
                          "bg-muted/60 hover:bg-primary/10 hover:text-primary",
                          "border border-border/40 hover:border-primary/30",
                          "transition-colors duration-100 cursor-pointer truncate"
                        )}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Send button */}
            <Button
              onClick={handleAddMessage}
              disabled={composerViewMode === 'preview'
                ? !newMessage.trim()
                : !composerEditorValue.trim()
              }
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
      {showExplanation && <div className="border-t border-border bg-muted/20 p-4">
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
            onChange={() => { }}
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
      </div>}

      {/* Floating formatting toolbar for composer textarea (edit mode only) */}
      <FloatingTextToolbar
        targetRef={inputRef}
        onApplyFormat={(prefix, suffix) => wrapOrInsertFormatting(prefix, suffix, '')}
        disabled={annotationMode}
      />

      <style>{`
        .chat-style-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default ChatStyleEditor;
