import { useState, useEffect, useCallback, useRef } from "react";

export interface LessonFlowSection {
  id: string;
  label: string;
  exists: boolean;
}

interface UseLessonFlowNavigationOptions {
  /** Offset from top of viewport for scroll-to (header height) */
  scrollOffset?: number;
  /** Hysteresis delay before changing active section (ms) */
  hysteresisMs?: number;
}

/**
 * Hook for Lesson Flow navigation - Single IntersectionObserver based scroll-spy
 *
 * Features:
 * - Uses ONE IntersectionObserver for all [data-flow] sections
 * - Tracks section with highest intersectionRatio
 * - Reading zone: top half of viewport (no top exclusion, 40% bottom inset)
 * - Hysteresis prevents flicker during fast scrolling
 * - No scroll listeners - pure IntersectionObserver
 * - Stable observer (not recreated on every active-section change)
 */
export function useLessonFlowNavigation(
  sectionConfig: Array<{ id: string; label: string }>,
  options: UseLessonFlowNavigationOptions = {}
) {
  const { scrollOffset = 140, hysteresisMs = 80 } = options;

  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});

  // Track intersection ratios for all sections - single source of truth
  const ratioMap = useRef<Map<string, number>>(new Map());
  const hysteresisTimer = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef<Set<Element>>(new Set());

  // Ref to track current activeFlow WITHOUT causing effect re-runs
  const activeFlowRef = useRef<string | null>(null);
  useEffect(() => {
    activeFlowRef.current = activeFlow;
  }, [activeFlow]);

  // Fix 2: ref to compare sectionStates without causing re-renders
  const sectionStatesRef = useRef<Record<string, boolean>>({});

  // Fix 4: ref to detect when sectionConfig actually changes by value
  const prevConfigRef = useRef<Array<{ id: string; label: string }>>([]);

  // Fix 5: guaranteed hysteresis cleanup on unmount
  useEffect(() => {
    return () => {
      if (hysteresisTimer.current) {
        clearTimeout(hysteresisTimer.current);
      }
    };
  }, []);

  // Resolve dominant section by highest ratio
  const resolveDominant = useCallback((): string | null => {
    let maxRatio = 0;
    let dominantId: string | null = null;

    ratioMap.current.forEach((ratio, id) => {
      if (ratio > maxRatio) {
        maxRatio = ratio;
        dominantId = id;
      }
    });

    // Require minimum 10% visibility to avoid switching on edges
    return maxRatio >= 0.1 ? dominantId : null;
  }, []);

  // Update active flow with hysteresis — uses ref, NOT captured activeFlow state
  const scheduleUpdate = useCallback(() => {
    if (hysteresisTimer.current) {
      clearTimeout(hysteresisTimer.current);
    }

    hysteresisTimer.current = window.setTimeout(() => {
      const newActive = resolveDominant();
      if (newActive !== null && newActive !== activeFlowRef.current) {
        setActiveFlow(newActive);
      }
    }, hysteresisMs);
  }, [resolveDominant, hysteresisMs]); // No activeFlow dep — uses ref instead

  // Single IntersectionObserver setup — only recreated when sectionConfig changes by value
  useEffect(() => {
    // Fix 4: bail out if config values are identical (prevents rebuild on reference churn)
    const isSame =
      prevConfigRef.current.length === sectionConfig.length &&
      prevConfigRef.current.every(
        (s, i) =>
          s.id === sectionConfig[i].id && s.label === sectionConfig[i].label
      );
    if (isSame) return;
    prevConfigRef.current = sectionConfig;

    // Cleanup existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    ratioMap.current.clear();
    observedElements.current.clear();

    // Create single observer
    // rootMargin: "0px 0px -40% 0px" — top of viewport triggers, bottom 40% excluded
    // This ensures the last section at the bottom of a page is still detected
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const flowId = entry.target.getAttribute("data-flow");
          if (flowId) {
            ratioMap.current.set(
              flowId,
              entry.isIntersecting ? entry.intersectionRatio : 0
            );
          }
        });
        scheduleUpdate();
      },
      {
        root: null, // viewport
        rootMargin: "0px 0px -40% 0px", // Top half+ of viewport triggers
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    // Find and observe all [data-flow] elements
    const observeFlowElements = () => {
      const elements = document.querySelectorAll("[data-flow]");
      const foundStates: Record<string, boolean> = {};

      sectionConfig.forEach((s) => {
        foundStates[s.id] = false;
      });

      elements.forEach((el) => {
        const flowId = el.getAttribute("data-flow");
        if (flowId && !observedElements.current.has(el)) {
          observerRef.current?.observe(el);
          observedElements.current.add(el);
          foundStates[flowId] = true;
        } else if (flowId) {
          foundStates[flowId] = true;
        }
      });

      // Fix 2: skip setSectionStates when nothing changed
      const hasChanged = sectionConfig.some(
        (s) => foundStates[s.id] !== sectionStatesRef.current[s.id]
      );
      if (hasChanged) {
        sectionStatesRef.current = foundStates;
        setSectionStates(foundStates);
      }

      // Set initial active if none set and sections exist
      if (!activeFlowRef.current && elements.length > 0) {
        const firstFlow = elements[0].getAttribute("data-flow");
        if (firstFlow) {
          setActiveFlow(firstFlow);
        }
      }
    };

    // Initial observation
    observeFlowElements();

    // Fix 3: single rAF instead of 150ms + 500ms timeouts — catches sections visible after first paint
    const rafId = requestAnimationFrame(() => {
      observeFlowElements();
    });

    // Fix 1: scope MutationObserver to lesson content container, not document.body
    const contentRoot =
      document.querySelector("[data-lesson-content]") ?? document.body;

    const mutationObserver = new MutationObserver(() => {
      observeFlowElements();
    });

    mutationObserver.observe(contentRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-flow"],
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (hysteresisTimer.current) {
        clearTimeout(hysteresisTimer.current);
      }
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
      ratioMap.current.clear();
      observedElements.current.clear();
    };
  }, [sectionConfig, scheduleUpdate]); // scheduleUpdate is stable now

  // Build enriched sections with existence state
  const sections: LessonFlowSection[] = sectionConfig.map((section) => ({
    id: section.id,
    label: section.label,
    exists: sectionStates[section.id] ?? false,
  }));

  // Scroll to section with offset
  const scrollToSection = useCallback(
    (flowId: string) => {
      const element = document.querySelector(`[data-flow="${flowId}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Check if already visible in the reading zone
      const isVisible = rect.top >= scrollOffset && rect.bottom <= viewportHeight;

      if (!isVisible) {
        const absoluteTop = window.scrollY + rect.top;
        window.scrollTo({
          top: absoluteTop - scrollOffset,
          behavior: "smooth",
        });
      }

      // Immediately set active for responsiveness
      setActiveFlow(flowId);
    },
    [scrollOffset]
  );

  return {
    activeSection: activeFlow,
    sections,
    scrollToSection,
  };
}

export default useLessonFlowNavigation;
