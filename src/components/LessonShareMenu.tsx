import { useState, useRef, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Share2, Linkedin } from "lucide-react";
import { trackPostShare } from "@/lib/shareAnalytics";

interface LessonShareMenuProps {
  postId: string;
  postTitle: string;
  postSlug: string;
  sectionName?: string;
  className?: string;
  alwaysVisible?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  vertical?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Use sidebar-friendly colors (lighter icon on dark sidebar bg) */
  sidebarVariant?: boolean;
  /** Use white text for active (e.g. on green primary bg) */
  isActive?: boolean;
}

const LessonShareMenu = ({ 
  postId, 
  postTitle, 
  postSlug, 
  sectionName,
  className, 
  alwaysVisible = false, 
  side = "top", 
  vertical = false, 
  onOpenChange,
  sidebarVariant = false,
  isActive = false
}: LessonShareMenuProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareUrl = `${window.location.origin}/courses/${postSlug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(postTitle);


  const clearAllTimeouts = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
  };

  const startAutoHideTimer = () => {
    // Clear existing auto-hide timer
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
    // Auto-hide after 1.5s of no hover
    autoHideTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      onOpenChange?.(false);
    }, 1500);
  };

  const handleMouseEnter = () => {
    clearAllTimeouts();

    // Small delay so the trigger tooltip can show briefly
    openTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      onOpenChange?.(true);
      // Start auto-hide timer when popover opens
      startAutoHideTimer();
    }, 250);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }

    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      onOpenChange?.(false);
    }, 150);
  };

  const handlePopoverMouseEnter = () => {
    // Cancel close and auto-hide when entering popover
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    // Start auto-hide timer when leaving popover
    startAutoHideTimer();
    
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      onOpenChange?.(false);
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  const handleShare = (platform: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    

    if (platform === "whatsapp") {
      trackPostShare(postId, "whatsapp");
      window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, "_blank", "noopener,noreferrer");
      return;
    }
    
    if (platform === "linkedin") {
      trackPostShare(postId, "linkedin");
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank", "noopener,noreferrer");
      return;
    }

    if (platform === "twitter") {
      trackPostShare(postId, "twitter");
      window.open(
        `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const WhatsAppIcon = () => (
    <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );


  const XIcon = () => (
    <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (newOpen) {
      startAutoHideTimer();
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <div 
            ref={containerRef} 
            className={`relative inline-block ${className || ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className={`p-1 rounded transition-opacity ${alwaysVisible || open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${
                isActive
                  ? 'text-sidebar-primary-foreground/70 hover:text-sidebar-primary-foreground'
                  : sidebarVariant 
                    ? 'text-sidebar-foreground/60 hover:text-sidebar-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          sideOffset={8}
          avoidCollisions={false}
          className={`p-0 border-0 bg-transparent shadow-none animate-in fade-in-0 zoom-in-95 duration-150 ${side === "right" ? "slide-in-from-left-2" : "slide-in-from-bottom-2"}`}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
        >
          <div 
            onClick={handleMenuClick}
            className={`${vertical ? "flex flex-col" : "flex"} items-center gap-1 rounded-lg border border-border/50 bg-popover/90 backdrop-blur-sm px-2 py-1.5 shadow-md`}
          >
            {/* WhatsApp */}
            <button
              onClick={(e) => handleShare("whatsapp", e)}
              className="flex items-center justify-center h-8 w-8 rounded-md text-[#25D366] hover:bg-[#25D366]/10 transition-all duration-150 hover:scale-105"
              title="WhatsApp"
            >
              <WhatsAppIcon />
            </button>

            {/* LinkedIn */}
            <button
              onClick={(e) => handleShare("linkedin", e)}
              className="flex items-center justify-center h-8 w-8 rounded-md text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-all duration-150 hover:scale-105"
              title="LinkedIn"
            >
              <Linkedin className="h-[18px] w-[18px]" />
            </button>

            {/* X */}
            <button
              onClick={(e) => handleShare("twitter", e)}
              className="flex items-center justify-center h-8 w-8 rounded-md text-foreground hover:bg-muted transition-all duration-150 hover:scale-105"
              title="X"
            >
              <XIcon />
            </button>

          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default LessonShareMenu;
