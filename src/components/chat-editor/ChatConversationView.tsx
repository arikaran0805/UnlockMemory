import { useMemo, useEffect, useState, useCallback, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MENTOR_CHARACTER, CourseCharacter, ChatMessage } from "./types";
import { FreeformCanvasData } from "./freeform/types";
import { extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { supabase } from "@/integrations/supabase/client";
import { renderCourseIcon } from "./utils";
import { MonacoCodeBlock } from "@/components/code-block";
import { getChatColors, getDynamicStyles, DynamicChatColors } from "./chatColors";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import { isTipTapJSON } from "@/lib/tiptapMigration";
import { RichTextRenderer } from "@/components/tiptap/RichTextRenderer";

// Lazy load the freeform canvas viewer to avoid loading fabric.js until needed
const FreeformCanvasViewer = lazy(() => 
  import("./freeform/FreeformCanvasViewer").then(m => ({ default: m.FreeformCanvasViewer }))
);

// Loading fallback for canvas components
const CanvasLoadingFallback = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center rounded-xl border border-border bg-muted/30 min-h-[200px]", className)}>
    <div className="text-center text-muted-foreground">
      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
      <p className="text-sm">Loading canvas...</p>
    </div>
  </div>
);

// Annotation data for explanation section tooltips
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

interface ChatConversationViewProps {
  content: string;
  courseType?: string;
  className?: string;
  codeTheme?: string;
  /** Allow rendering single-speaker conversations (used in canvas blocks) */
  allowSingleSpeaker?: boolean;
  /** Annotations for the explanation section */
  explanationAnnotations?: ExplanationAnnotation[];
  isAdmin?: boolean;
  isModerator?: boolean;
  onAnnotationResolve?: (annotationId: string) => void;
  onAnnotationDismiss?: (annotationId: string) => void;
  onAnnotationDelete?: (annotationId: string) => void;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

// Takeaway format: [TAKEAWAY:icon:title]: content
const TAKEAWAY_REGEX = /^\[TAKEAWAY(?::([^:]*?))?(?::([^\]]*?))?\]:\s*/;
// Freeform canvas format: [FREEFORM_CANVAS]:{json data}
const FREEFORM_REGEX = /^\[FREEFORM_CANVAS\]:(.*)$/;

// Check if content contains code blocks
const hasCodeBlock = (content: string): boolean => {
  return /```[\s\S]*?```/.test(content);
};

const parseConversation = (content: string, allowSingle?: boolean): ChatMessage[] => {
  const segments = extractChatSegments(content, allowSingle ? { allowSingle: true } : undefined);
  if (segments.length === 0) return [];

  return segments.map((s, index) => {
    // Handle freeform canvas blocks
    const freeformMatch = s.content.match(FREEFORM_REGEX);
    if (s.speaker === "FREEFORM" || freeformMatch) {
      let freeformData: FreeformCanvasData | undefined;
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
        id: `takeaway-${index}`,
        speaker: "TAKEAWAY",
        content: actualContent,
        type: "takeaway" as const,
        takeawayIcon: icon,
        takeawayTitle: title,
      };
    }
    return {
      id: `msg-${index}-${s.speaker}`,
      speaker: s.speaker,
      content: s.content,
      type: "message" as const,
    };
  }).filter((m) => m.speaker.trim() && (m.content.trim() || m.type === "freeform"));
};

// Helper to extract code blocks from HTML and replace with placeholders
const extractCodeBlocksFromHtml = (html: string): {
  processedHtml: string;
  codeBlocks: { code: string; language: string }[];
} => {
  const codeBlocks: { code: string; language: string }[] = [];

  // Match <pre class="ql-syntax"...>...</pre> from Quill editor
  const preRegex = /<pre[^>]*class="[^"]*ql-syntax[^"]*"[^>]*>([\s\S]*?)<\/pre>/gi;

  const processedHtml = html.replace(preRegex, (_match, content) => {
    const decodedContent = String(content)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();

    let language = "python";
    if (decodedContent.match(/^(function|const|let|var|import|export)\s/m)) {
      language = "javascript";
    } else if (decodedContent.match(/^(def|class|import|from|print)\s/m)) {
      language = "python";
    } else if (decodedContent.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)\s/im)) {
      language = "sql";
    }

    codeBlocks.push({ code: decodedContent, language });
    return `<!--CODE_BLOCK_${codeBlocks.length - 1}-->`;
  });

  return { processedHtml, codeBlocks };
};

// Inline takeaway block with copy functionality
const TakeawayInlineBlock = ({ 
  icon, 
  title, 
  content, 
  staggerDelay 
}: { 
  icon: string; 
  title: string; 
  content: string; 
  staggerDelay: number;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1],
        delay: 0.1 + staggerDelay 
      }}
      className={cn(
        "group my-4 rounded-xl overflow-hidden",
        "border-t border-b border-border/50",
        "bg-gradient-to-r from-muted/20 to-muted/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <motion.span 
          className="text-xl"
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 15,
            delay: 0.2 + staggerDelay 
          }}
        >
          {icon}
        </motion.span>
        <span className="flex-1 font-semibold text-sm text-foreground">{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 py-3 pl-6 relative">
        <motion.div 
          className="absolute left-4 top-3 bottom-3 w-0.5 bg-primary/40 rounded-full"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ 
            duration: 0.4, 
            delay: 0.3 + staggerDelay,
            ease: "easeOut"
          }}
          style={{ originY: 0 }}
        />
        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </motion.div>
  );
};

const ChatConversationView = ({
  content,
  courseType = "python",
  className,
  codeTheme,
  allowSingleSpeaker = false,
  explanationAnnotations = [],
  isAdmin = false,
  isModerator = false,
  onAnnotationResolve,
  onAnnotationDismiss,
  onAnnotationDelete,
}: ChatConversationViewProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [dynamicColors, setDynamicColors] = useState<DynamicChatColors | null>(null);
  const messages = useMemo(() => parseConversation(content, allowSingleSpeaker), [content, allowSingleSpeaker]);
  const explanation = useMemo(() => extractExplanation(content), [content]);
  const isExplanationTipTapJSON = useMemo(() => isTipTapJSON(explanation), [explanation]);

  const { processedHtml: explanationHtml, codeBlocks: explanationCodeBlocks } = useMemo(() => {
    // Skip code block extraction if it's TipTap JSON - RichTextRenderer will handle it
    if (!explanation || isExplanationTipTapJSON) return { processedHtml: "", codeBlocks: [] as { code: string; language: string }[] };
    return extractCodeBlocksFromHtml(explanation);
  }, [explanation, isExplanationTipTapJSON]);

  // Fetch courses and dynamic colors from database
  useEffect(() => {
    const fetchData = async () => {
      const [coursesResult, settingsResult] = await Promise.all([
        supabase.from("courses").select("id, name, slug, icon").order("name"),
        supabase.from("site_settings").select(`
          mentor_bubble_bg,
          mentor_bubble_text,
          mentor_avatar_gradient_from,
          mentor_avatar_gradient_to,
          course_bubble_bg,
          course_bubble_text,
          course_avatar_gradient_from,
          course_avatar_gradient_to
        `).limit(1).maybeSingle()
      ]);
      
      if (!coursesResult.error && coursesResult.data) {
        setCourses(coursesResult.data);
      }
      
      if (!settingsResult.error && settingsResult.data) {
        const data = settingsResult.data as any;
        setDynamicColors({
          mentor: {
            bubbleBg: data.mentor_bubble_bg || "#d4f5e6",
            bubbleText: data.mentor_bubble_text || "#064e3b",
            avatarGradientFrom: data.mentor_avatar_gradient_from || "#34d399",
            avatarGradientTo: data.mentor_avatar_gradient_to || "#059669",
          },
          course: {
            bubbleBg: data.course_bubble_bg || "#f1f5f9",
            bubbleText: data.course_bubble_text || "#0f172a",
            avatarGradientFrom: data.course_avatar_gradient_from || "#e2e8f0",
            avatarGradientTo: data.course_avatar_gradient_to || "#cbd5e1",
          },
        });
      }
    };
    fetchData();
  }, []);

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

  const courseCharacter = getCourseCharacter(courseType);

  const getCharacterForSpeaker = useCallback((speaker: string): CourseCharacter => {
    if (speaker.toLowerCase() === "karan") {
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

  const isMentor = (speaker: string) => speaker.toLowerCase() === "karan";

  // Parse inline markdown formatting (bold, italic, inline code)
  const parseInlineMarkdown = (text: string, baseKey: string, isMentorBubble: boolean): React.ReactNode[] => {
    const segments: React.ReactNode[] = [];
    
    // Combined regex for all inline formatting
    // Order matters: bold first, then italic
    const markdownRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)/g;
    
    let lastIdx = 0;
    let match;
    
    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIdx) {
        segments.push(
          <span key={`${baseKey}-text-${lastIdx}`} className="whitespace-pre-wrap">
            {text.slice(lastIdx, match.index)}
          </span>
        );
      }
      
      if (match[1]) {
        // Bold: **text**
        segments.push(
          <strong key={`${baseKey}-bold-${match.index}`} className="font-bold">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Italic: *text*
        segments.push(
          <em key={`${baseKey}-italic-${match.index}`} className="italic">
            {match[4]}
          </em>
        );
      } else if (match[5]) {
        // Inline code: `code`
        const colors = getChatColors(isMentorBubble);
        segments.push(
          <code
            key={`${baseKey}-code-${match.index}`}
            className={cn(
              "px-1.5 py-0.5 rounded text-xs font-mono",
              colors.inlineCode
            )}
          >
            {match[6]}
          </code>
        );
      }
      
      lastIdx = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIdx < text.length) {
      segments.push(
        <span key={`${baseKey}-text-end`} className="whitespace-pre-wrap">
          {text.slice(lastIdx)}
        </span>
      );
    }
    
    return segments.length > 0 ? segments : [<span key={baseKey} className="whitespace-pre-wrap">{text}</span>];
  };

  // Parse line-level markdown (headings, lists, blockquotes)
  const parseLineMarkdown = (text: string, baseKey: string, isMentorBubble: boolean): React.ReactNode[] => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    
    lines.forEach((line, lineIdx) => {
      const lineKey = `${baseKey}-line-${lineIdx}`;
      
      // Heading: ## text
      if (line.match(/^##\s+(.+)$/)) {
        const headingContent = line.replace(/^##\s+/, '');
        result.push(
          <h2 key={lineKey} className="text-base font-bold mt-2 mb-1">
            {parseInlineMarkdown(headingContent, lineKey, isMentorBubble)}
          </h2>
        );
      }
      // Blockquote: > text
      else if (line.match(/^>\s+(.+)$/)) {
        const quoteContent = line.replace(/^>\s+/, '');
        const colors = getChatColors(isMentorBubble);
        result.push(
          <blockquote key={lineKey} className={cn(
            "border-l-2 pl-3 my-1 italic",
            colors.blockquoteBorder
          )}>
            {parseInlineMarkdown(quoteContent, lineKey, isMentorBubble)}
          </blockquote>
        );
      }
      // Bullet list: • text or - text
      else if (line.match(/^[•\-]\s+(.+)$/)) {
        const listContent = line.replace(/^[•\-]\s+/, '');
        result.push(
          <div key={lineKey} className="flex items-start gap-2 ml-1">
            <span className="text-sm">•</span>
            <span>{parseInlineMarkdown(listContent, lineKey, isMentorBubble)}</span>
          </div>
        );
      }
      // Numbered list: 1. text
      else if (line.match(/^(\d+)\.\s+(.+)$/)) {
        const match = line.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
          result.push(
            <div key={lineKey} className="flex items-start gap-2 ml-1">
              <span className="text-sm min-w-[1rem]">{match[1]}.</span>
              <span>{parseInlineMarkdown(match[2], lineKey, isMentorBubble)}</span>
            </div>
          );
        }
      }
      // Regular text with inline formatting
      else if (line.trim()) {
        result.push(
          <span key={lineKey}>
            {parseInlineMarkdown(line, lineKey, isMentorBubble)}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        );
      }
      // Empty line
      else if (lineIdx < lines.length - 1) {
        result.push(<br key={lineKey} />);
      }
    });
    
    return result;
  };

  // Render code blocks and inline code within messages
  const renderContent = (text: string, isMentorBubble: boolean) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: { type: string; language?: string; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", language: match[1] || "", content: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: "text", content: text });
    }

    return parts.map((part, idx) => {
      if (part.type === "code") {
        return (
          <MonacoCodeBlock
            key={idx}
            code={part.content}
            language={part.language}
            editable={true}
            showLanguageLabel={true}
          />
        );
      }
      return <span key={idx}>{parseLineMarkdown(part.content, `part-${idx}`, isMentorBubble)}</span>;
    });
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Chat conversation - Chat Bubbles Section */}
      <div
        id="lesson-chat-bubbles"
        data-flow="chat"
        className={cn(
          "chat-conversation-view overflow-hidden"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-black/[0.045]">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {/* Mentor (Karan) avatar */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold opacity-80 transition-colors hover:bg-emerald-500/16"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#3F5C50" }}
              >
                K
              </div>
              {/* Course avatar */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold opacity-80 transition-colors hover:bg-[#E2EBE6]"
                style={
                  { backgroundColor: "#E8F0EC", color: "#5E7068" }
                }
              >
                {courseCharacter.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
            <div className="flex flex-col gap-0">
              <div className="text-[12.5px] font-semibold text-[#1e1e1e] tracking-tight leading-tight">
                Karan {'&'} {courseCharacter.name}
              </div>
              <div className="text-[11px] text-[#9A9A9A] leading-tight mt-0.5">
                Interactive Lesson
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
            <span className="text-[11px] text-[#9A9A9A] tracking-wide">Live</span>
          </div>
        </div>

        {/* Messages */}
        <div className="relative p-6">
          {/* Conversation spine — aligns with left avatar center (p-6=24px + w-7/2=14px = 38px) */}
          <div className="pointer-events-none absolute bottom-6 left-[38px] top-6 w-px bg-emerald-400/[0.24]" />
          {/* Empty state when no messages */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Add chat messages to create an interactive lesson dialogue
              </p>
            </div>
          )}
          {messages.map((message, index) => {
            // Render freeform canvas blocks
            if (message.type === "freeform") {
              return (
                <div
                  key={message.id}
                  className={cn(
                    "my-4 animate-in fade-in-0 slide-in-from-bottom-2"
                  )}
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
                >
                  {message.freeformData ? (
                    <Suspense fallback={<CanvasLoadingFallback />}>
                      <FreeformCanvasViewer
                        data={message.freeformData}
                        className="min-h-[200px] max-h-[500px]"
                      />
                    </Suspense>
                  ) : (
                    <div className="flex items-center justify-center min-h-[200px] rounded-xl border border-dashed border-border bg-muted/30">
                      <p className="text-sm text-muted-foreground">Visual explanation unavailable</p>
                    </div>
                  )}
                </div>
              );
            }

            // Render takeaway blocks with staggered animation
            if (message.type === "takeaway") {
              const icon = message.takeawayIcon || "🧠";
              const title = message.takeawayTitle || "One-Line Takeaway for Learners";
              const staggerDelay = index * 0.12;
              
              return (
                <TakeawayInlineBlock
                  key={message.id}
                  icon={icon}
                  title={title}
                  content={message.content}
                  staggerDelay={staggerDelay}
                />
              );
            }

            const character = getCharacterForSpeaker(message.speaker);
            const isMentorBubble = isMentor(message.speaker);

            const dynamicStyle = getDynamicStyles(dynamicColors, isMentorBubble);

            // Tighten spacing when adjacent messages are from the same speaker
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const isSameSpeakerAsPrev =
              prevMessage?.type === "message" &&
              prevMessage.speaker.toLowerCase() === message.speaker.toLowerCase();

            return (
              <div
                key={message.id}
                className={cn(
                  "relative flex items-end gap-2 animate-in fade-in-0 slide-in-from-bottom-2",
                  isSameSpeakerAsPrev ? "mb-2.5 mt-0" : "mb-7",
                  isMentorBubble ? "flex-row-reverse" : "flex-row"
                )}
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
              >
                {/* Avatar — hidden for consecutive same-speaker messages to reduce visual noise */}
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors",
                    isSameSpeakerAsPrev ? "opacity-0 pointer-events-none" : "opacity-55",
                  )}
                  style={
                    isMentorBubble
                      ? { backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#3F5C50" }
                      : { backgroundColor: "#E8F0EC", color: "#5E7068" }
                  }
                >
                  {isMentorBubble ? (
                    <span className="leading-none">K</span>
                  ) : (
                    <span className="leading-none">{character.name?.charAt(0)?.toUpperCase() || "U"}</span>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "relative px-[12px] py-2 rounded-xl transition-colors duration-200",
                    hasCodeBlock(message.content) ? "w-[75%] max-w-[75%] min-w-[360px]" : "max-w-[75%]"
                  )}
                  style={{
                    backgroundColor: dynamicStyle
                      ? dynamicStyle.bubbleStyle.backgroundColor
                      : isMentorBubble
                        ? "rgba(16, 185, 129, 0.05)"
                        : "rgba(0, 0, 0, 0.019)",
                    ...(dynamicStyle ? dynamicStyle.textStyle : undefined),
                  }}
                >
                  {/* Speaker label — only on first in a run */}
                  {!isSameSpeakerAsPrev && (
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#888888]">
                      {character.name}
                    </div>
                  )}

                  {/* Content */}
                  <div className="text-[14px] leading-[1.6] text-[#1F1F1F]">
                    {renderContent(message.content, isMentorBubble)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          .chat-conversation-view {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
          }
          
          @keyframes messageAppear {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>

      {/* Explanation section (if present) - Cause & Effect Section */}
      {explanation && (
        <div 
          id="lesson-cause-effect" 
          data-flow="cause"
          className="prose prose-sm dark:prose-invert max-w-none p-6 rounded-xl bg-muted/30 border border-border/50"
        >
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">📝</span> Explanation
          </h3>

          {/* ✅ TipTap JSON: Use RichTextRenderer with full schema support */}
          {isExplanationTipTapJSON ? (
            <div className="leading-relaxed text-foreground/90">
              <RichTextRenderer 
                content={explanation} 
                emptyPlaceholder=""
                annotations={explanationAnnotations}
                isAdmin={isAdmin}
                isModerator={isModerator}
                onAnnotationResolve={onAnnotationResolve}
                onAnnotationDismiss={onAnnotationDismiss}
                onAnnotationDelete={onAnnotationDelete}
              />
            </div>
          ) : explanationCodeBlocks.length === 0 ? (
            <div
              className="leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(explanation) }}
            />
          ) : (
            <div className="leading-relaxed text-foreground/90">
              {explanationHtml.split(/<!--CODE_BLOCK_(\d+)-->/).map((part, idx) => {
                if (idx % 2 === 0) {
                  return part ? (
                    <div key={idx} dangerouslySetInnerHTML={{ __html: sanitizeHtml(part) }} />
                  ) : null;
                }

                const codeBlockIndex = parseInt(part, 10);
                const block = explanationCodeBlocks[codeBlockIndex];
                if (!block) return null;

                return (
                  <div key={idx} className="my-4 not-prose">
                    <MonacoCodeBlock
                      code={block.code}
                      language={block.language}
                      editable={true}
                      showLanguageLabel={true}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatConversationView;
