import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Smile, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceRecordingBar } from "./VoiceRecordingBar";
import { AttachmentPreview } from "./AttachmentPreview";
import { EmojiPicker } from "./EmojiPicker";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
];
const ALL_ALLOWED = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

interface ChatComposerProps {
  onSend: (text: string) => void;
  onSendVoice?: (blob: Blob, duration: number) => void;
  onSendAttachment?: (file: File) => void;
  isSending: boolean;
  placeholder?: string;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export function ChatComposer({
  onSend,
  onSendVoice,
  onSendAttachment,
  isSending,
  placeholder,
  onTyping,
  onStopTyping,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const voice = useVoiceRecorder();
  const isVoiceMode = voice.isRecording || voice.audioBlob !== null;

  const canSend = text.trim().length > 0 && !isSending;
  const hasText = text.trim().length > 0;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onStopTyping?.();
    onSend(text.trim());
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [canSend, text, onSend, onStopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedFile) {
        handleSendAttachment();
      } else {
        handleSend();
      }
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 100) + "px";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (e.target.value.trim()) onTyping?.();
  };

  // --- Attachment ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }
    if (!ALL_ALLOWED.includes(file.type)) {
      toast.error("File type not supported.");
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleRemoveFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
  };

  const handleSendAttachment = () => {
    if (!selectedFile || !onSendAttachment) return;
    onSendAttachment(selectedFile);
    handleRemoveFile();
  };

  // --- Voice ---
  const handleSendVoice = () => {
    if (!voice.audioBlob || !onSendVoice) return;
    onSendVoice(voice.audioBlob, voice.duration);
    voice.discardRecording();
  };

  const handleMicClick = () => {
    if (!onSendVoice) {
      toast.info("Voice messages are not available yet.");
      return;
    }
    voice.startRecording();
  };

  // --- Voice recording mode ---
  if (isVoiceMode) {
    return (
      <VoiceRecordingBar
        isRecording={voice.isRecording}
        duration={voice.duration}
        onStop={voice.stopRecording}
        onCancel={() => {
          if (voice.isRecording) voice.cancelRecording();
          else voice.discardRecording();
        }}
        onSend={voice.audioBlob ? handleSendVoice : undefined}
        hasRecording={voice.audioBlob !== null}
      />
    );
  }

  // --- Voice error ---
  if (voice.error) {
    toast.error(voice.error);
  }

  return (
    <>
      {/* Attachment preview */}
      {selectedFile && (
        <AttachmentPreview
          file={selectedFile}
          previewUrl={filePreviewUrl || undefined}
          onRemove={handleRemoveFile}
        />
      )}

      <div className="border-t border-border/30 px-3 py-2.5">
        <div className="flex items-end gap-2 bg-muted/25 rounded-2xl px-3 py-2 border border-border/20">
          {/* Attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 mb-0.5"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALL_ALLOWED.join(",")}
            onChange={handleFileSelect}
          />

          {/* Input */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
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

          {/* Send or Mic */}
          {hasText || selectedFile ? (
            <button
              onClick={selectedFile ? handleSendAttachment : handleSend}
              disabled={selectedFile ? !onSendAttachment || isSending : !canSend}
              className={cn(
                "p-1.5 rounded-xl flex-shrink-0 mb-0.5 transition-all duration-200",
                (selectedFile ? onSendAttachment && !isSending : canSend)
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md"
                  : "bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleMicClick}
              className="p-1.5 rounded-xl flex-shrink-0 mb-0.5 transition-all duration-200 bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary"
              title="Record voice message"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
