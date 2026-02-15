import { useRef, useEffect } from "react";
import { ChatMessage, CourseCharacter } from "./types";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { renderCourseIcon } from "./utils";
import { MonacoCodeBlock } from "@/components/code-block";
import { getChatColors } from "./chatColors";
import { ChatEditor, type ChatEditorRef } from "@/components/tiptap/ChatEditor";

// Check if content contains code blocks
const hasCodeBlock = (content: string): boolean => {
  return /```[\s\S]*?```/.test(content);
};

interface ChatBubbleProps {
  message: ChatMessage;
  character: CourseCharacter;
  isMentor: boolean;
  isEditing: boolean;
  onEdit: (id: string, content: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  codeTheme?: string;
  hasOpenAnnotations?: boolean;
  annotationMode?: boolean;
}

const ChatBubble = ({
  message,
  character,
  isMentor,
  isEditing,
  onEdit,
  onStartEdit,
  onEndEdit,
  isDragging,
  codeTheme,
  hasOpenAnnotations,
}: ChatBubbleProps) => {
  const chatEditorRef = useRef<ChatEditorRef>(null);

  useEffect(() => {
    if (isEditing && chatEditorRef.current) {
      chatEditorRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = (markdown: string) => {
    onEdit(message.id, markdown);
    onEndEdit();
  };

  // Parse inline markdown formatting
  const parseInlineMarkdown = (text: string, baseKey: string): React.ReactNode[] => {
    const segments: React.ReactNode[] = [];
    const markdownRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)/g;
    let lastIdx = 0;
    let match;
    
    while ((match = markdownRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        segments.push(<span key={`${baseKey}-text-${lastIdx}`} className="whitespace-pre-wrap">{text.slice(lastIdx, match.index)}</span>);
      }
      if (match[1]) {
        segments.push(<strong key={`${baseKey}-bold-${match.index}`} className="font-bold">{match[2]}</strong>);
      } else if (match[3]) {
        segments.push(<em key={`${baseKey}-italic-${match.index}`} className="italic">{match[4]}</em>);
      } else if (match[5]) {
        segments.push(
          <code key={`${baseKey}-code-${match.index}`} className={cn("px-1.5 py-0.5 rounded text-xs font-mono", getChatColors(isMentor).inlineCode)}>
            {match[6]}
          </code>
        );
      }
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      segments.push(<span key={`${baseKey}-text-end`} className="whitespace-pre-wrap">{text.slice(lastIdx)}</span>);
    }
    return segments.length > 0 ? segments : [<span key={baseKey} className="whitespace-pre-wrap">{text}</span>];
  };

  // Parse line-level markdown
  const parseLineMarkdown = (text: string, baseKey: string): React.ReactNode[] => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const lineKey = `${baseKey}-line-${lineIdx}`;
      if (line.match(/^##\s+(.+)$/)) {
        return <h2 key={lineKey} className="text-base font-bold mt-2 mb-1">{parseInlineMarkdown(line.replace(/^##\s+/, ''), lineKey)}</h2>;
      }
      if (line.match(/^>\s+(.+)$/)) {
        return <blockquote key={lineKey} className={cn("border-l-2 pl-3 my-1 italic", getChatColors(isMentor).blockquoteBorder)}>{parseInlineMarkdown(line.replace(/^>\s+/, ''), lineKey)}</blockquote>;
      }
      if (line.match(/^[•\-]\s+(.+)$/)) {
        return <div key={lineKey} className="flex items-start gap-2 ml-1"><span className="text-sm">•</span><span>{parseInlineMarkdown(line.replace(/^[•\-]\s+/, ''), lineKey)}</span></div>;
      }
      if (line.match(/^(\d+)\.\s+(.+)$/)) {
        const m = line.match(/^(\d+)\.\s+(.+)$/);
        if (m) return <div key={lineKey} className="flex items-start gap-2 ml-1"><span className="text-sm min-w-[1rem]">{m[1]}.</span><span>{parseInlineMarkdown(m[2], lineKey)}</span></div>;
      }
      if (line.trim()) {
        return <span key={lineKey}>{parseInlineMarkdown(line, lineKey)}{lineIdx < lines.length - 1 && <br />}</span>;
      }
      return lineIdx < lines.length - 1 ? <br key={lineKey} /> : null;
    });
  };

  // Render content with code blocks
  const renderContent = (content: string) => {
    if (!content) return null;
    
    const trimmed = content.trim();
    
    // FIRST: Check for corrupted/partial JSON patterns before any parsing
    // This catches strings like `"doc","content":...` or `{"type":"paragraph"...` fragments
    const corruptedPatterns = [
      '"doc","content"',
      '"type":"doc"',
      '"type":"paragraph"',
      '"type":"text"',
      '"content":[{',
      '{"type":"',
    ];
    
    // If content looks like JSON fragments but isn't valid parseable JSON, suppress it
    const looksLikeJsonFragment = corruptedPatterns.some(pattern => trimmed.includes(pattern));
    if (looksLikeJsonFragment) {
      // Try to parse - if it's valid TipTap JSON, extract text; otherwise suppress
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
          // Valid TipTap JSON - extract text
          const extractText = (node: any): string => {
            if (node.text) return node.text;
            if (node.content) return node.content.map(extractText).join('\n');
            return '';
          };
          const extracted = extractText(parsed).trim();
          if (!extracted) return null;
          // Continue with extracted text
          return renderMarkdownContent(extracted);
        }
      } catch {
        // Not valid JSON - it's corrupted, don't render
        return null;
      }
      // If we get here, it's JSON but not TipTap format - suppress
      return null;
    }
    
    // Check for valid TipTap JSON that starts properly
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
          const extractText = (node: any): string => {
            if (node.text) return node.text;
            if (node.content) return node.content.map(extractText).join('\n');
            return '';
          };
          const extracted = extractText(parsed).trim();
          if (!extracted) return null;
          return renderMarkdownContent(extracted);
        }
      } catch {
        // Not valid JSON, continue with normal rendering
      }
    }
    
    return renderMarkdownContent(content);
  };
  
  // Separate function to render markdown content
  const renderMarkdownContent = (content: string) => {
    let processedContent = content;
    
    // Fix escaped newlines (literal \n) to actual newlines
    processedContent = processedContent.replace(/\\n/g, '\n');
    
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: { type: string; language?: string; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(processedContent)) !== null) {
      if (match.index > lastIndex) parts.push({ type: "text", content: processedContent.slice(lastIndex, match.index) });
      parts.push({ type: "code", language: match[1] || "", content: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < processedContent.length) parts.push({ type: "text", content: processedContent.slice(lastIndex) });
    if (parts.length === 0) parts.push({ type: "text", content: processedContent });

    return parts.map((part, idx) => {
      if (part.type === "code") {
        return <div key={idx} className="-mx-4 px-0"><MonacoCodeBlock code={part.content} language={part.language} editable showLanguageLabel /></div>;
      }
      return <span key={idx}>{parseLineMarkdown(part.content, `part-${idx}`)}</span>;
    });
  };

  return (
    <div className={cn("group flex items-end gap-2 mb-3 transition-all duration-200", isMentor ? "flex-row-reverse" : "flex-row", isDragging && "opacity-50 scale-105")}>
      {/* Avatar */}
      <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm transition-transform duration-200 group-hover:scale-110", getChatColors(isMentor).avatar)}>
        {renderCourseIcon(character.emoji, 18)}
      </div>

      {/* Bubble - wider when containing code blocks */}
      <div className={cn(
        "relative px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200",
        isEditing ? "flex-1 max-w-full" : hasCodeBlock(message.content) ? "w-[75%] max-w-[75%] min-w-[360px]" : "max-w-[70%] min-w-[60px]",
        getChatColors(isMentor).text,
        isMentor ? "rounded-br-md" : "rounded-bl-md",
        isDragging && "ring-2 ring-primary/50",
        hasOpenAnnotations && "ring-2 ring-amber-500 ring-offset-1 ring-offset-background"
      )}>
        {/* Annotation indicator */}
        {hasOpenAnnotations && (
          <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-sm">
            <MessageSquare className="w-3 h-3" />
          </div>
        )}

        {/* Speaker name */}
        <div className={cn("text-[10px] font-medium mb-1 opacity-70 flex items-center gap-1", getChatColors(isMentor).speaker)}>
          {character.name} {renderCourseIcon(character.emoji, 12)}
        </div>

        {/* Content */}
        {isEditing ? (
          <ChatEditor
            ref={chatEditorRef}
            value={message.content}
            onSave={handleSave}
            onCancel={onEndEdit}
            isMentor={isMentor}
            codeTheme={codeTheme}
            placeholder="Type your message..."
          />
        ) : (
          <div className="text-sm leading-relaxed">
            {renderContent(message.content)}
          </div>
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <div className={cn("text-[9px] mt-1 opacity-50", isMentor ? "text-right" : "")}>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
