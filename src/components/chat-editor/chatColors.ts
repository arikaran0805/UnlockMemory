// Shared color configuration for chat bubbles
// These colors are used in both ChatBubble (editor) and ChatConversationView (reader)

// Default static colors (used as fallback in editor and for static Tailwind classes)
export const CHAT_COLORS = {
  mentor: {
    // Bubble background
    bubble: "bg-[#d4f5e6] dark:bg-emerald-900/40",
    // Bubble text
    text: "text-emerald-900 dark:text-emerald-100",
    // Avatar gradient
    avatar: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    // Speaker name text
    speaker: "text-emerald-700 dark:text-emerald-300",
    // Inline code
    inlineCode: "bg-emerald-500/30 text-emerald-900 dark:text-emerald-100",
    // Blockquote border
    blockquoteBorder: "border-emerald-300",
    // Button active state
    buttonActive: "bg-emerald-200/50 dark:bg-emerald-800/50",
    // Button hover
    buttonHover: "hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50",
  },
  course: {
    // Bubble background
    bubble: "bg-neutral-200 dark:bg-neutral-800",
    // Bubble text
    text: "text-content-primary dark:text-content-inverse",
    // Avatar gradient
    avatar: "bg-gradient-to-br from-neutral-300 to-neutral-400 dark:from-neutral-600 dark:to-neutral-800",
    // Speaker name text
    speaker: "text-content-secondary dark:text-content-muted",
    // Inline code
    inlineCode: "bg-muted-foreground/20 text-foreground",
    // Blockquote border
    blockquoteBorder: "border-muted-foreground/50",
    // Button active state
    buttonActive: "bg-neutral-300/50 dark:bg-neutral-800/50",
    // Button hover
    buttonHover: "hover:bg-neutral-300/50 dark:hover:bg-neutral-800/50",
  },
} as const;

// Helper to get static colors based on whether it's a mentor bubble
export const getChatColors = (isMentor: boolean) => 
  isMentor ? CHAT_COLORS.mentor : CHAT_COLORS.course;

// Dynamic color settings interface (from database)
export interface DynamicChatColors {
  mentor: {
    bubbleBg: string;
    bubbleText: string;
    avatarGradientFrom: string;
    avatarGradientTo: string;
  };
  course: {
    bubbleBg: string;
    bubbleText: string;
    avatarGradientFrom: string;
    avatarGradientTo: string;
  };
}

// Helper to generate inline styles from dynamic colors
export const getDynamicStyles = (colors: DynamicChatColors | null, isMentor: boolean) => {
  if (!colors) return null;
  
  const c = isMentor ? colors.mentor : colors.course;
  return {
    bubbleStyle: { backgroundColor: c.bubbleBg },
    textStyle: { color: c.bubbleText },
    avatarStyle: { background: `linear-gradient(135deg, ${c.avatarGradientFrom}, ${c.avatarGradientTo})` },
  };
};
