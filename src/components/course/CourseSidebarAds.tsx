import { SidebarAdTop, SidebarAdMiddle, SidebarAdBottom } from "@/components/ads";
import { AdClarityText } from "@/components/course/nudges";
import { cn } from "@/lib/utils";

interface CourseSidebarAdsProps {
  adSettings: {
    googleAdClient?: string;
    sidebarTopSlot?: string;
    sidebarMiddleSlot?: string;
    sidebarBottomSlot?: string;
  } | null;
  showAds?: boolean;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  hasPreviewBanner?: boolean;
  className?: string;
  /**
   * Pro user viewing a non-career course - show clarity text near ads
   */
  showClarityText?: boolean;
}

/**
 * Ad slots for course sidebar - shown to guests, free learners,
 * and Pro users viewing non-career courses.
 */
export const CourseSidebarAds = ({
  adSettings,
  showAds = true,
  isHeaderVisible,
  showAnnouncement,
  hasPreviewBanner = false,
  className = "",
  showClarityText = false,
}: CourseSidebarAdsProps) => {
  // Calculate sticky position
  const stickyTopClass = hasPreviewBanner
    ? isHeaderVisible
      ? (showAnnouncement ? 'top-[10.5rem]' : 'top-[8.5rem]')
      : (showAnnouncement ? 'top-[7.25rem]' : 'top-20')
    : isHeaderVisible
      ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
      : (showAnnouncement ? 'top-[4.75rem]' : 'top-10');

  return (
    <aside className={cn("hidden xl:block w-[300px] flex-shrink-0", className)}>
      <div className={cn("sticky transition-[top] duration-200 ease-out", stickyTopClass)}>
        {showAds ? (
          <div className="space-y-4 p-1 pb-6">
            {/* Top Ad Slot */}
            <SidebarAdTop
              googleAdSlot={adSettings?.sidebarTopSlot}
              googleAdClient={adSettings?.googleAdClient}
            />

            {/* Middle Ad Slot */}
            <SidebarAdMiddle
              googleAdSlot={adSettings?.sidebarMiddleSlot}
              googleAdClient={adSettings?.googleAdClient}
            />

            {/* Bottom Ad Slot */}
            <SidebarAdBottom
              googleAdSlot={adSettings?.sidebarBottomSlot}
              googleAdClient={adSettings?.googleAdClient}
            />

            {/* Clarity text for Pro users on non-career courses */}
            {showClarityText && (
              <AdClarityText className="mt-2" />
            )}
          </div>
        ) : (
          <div aria-hidden="true" className="min-h-px p-1 pb-6" />
        )}
      </div>
    </aside>
  );
};

export default CourseSidebarAds;
