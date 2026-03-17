import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  onSend: (text: string) => void;
  isSending: boolean;
  placeholder?: string;
}

export function ChatComposer({ onSend, isSending, placeholder }: ChatComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 && !isSending;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, text, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 100) + "px";
    }
  };

  return (
    <div className="border-t border-border/30 px-3 py-2.5">
      <div className="flex items-end gap-2 bg-muted/25 rounded-2xl px-3 py-2 border border-border/20">
        {/* Attach */}
        <button
          className="p-1 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 mb-0.5"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type a message..."}
          rows={1}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 resize-none outline-none min-h-[20px] max-h-[100px] leading-5 py-0.5"
        />

        {/* Emoji */}
        <button
          className="p-1 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 mb-0.5"
          title="Emoji"
        >
          <Smile className="h-4 w-4" />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "p-1.5 rounded-xl flex-shrink-0 mb-0.5 transition-all duration-200",
            canSend
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md"
              : "bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
