import { useState, useEffect, useCallback, useRef } from "react";

export interface LessonFlowSection {
  id: string;
  label: string;
  exists: boolean;
  /** true if auto-discovered from DOM (e.g., a TipTap heading) */
  isDynamic?: boolean;
  /** heading depth: 1=h1, 2=h2, 3=h3 (only set for isDynamic sections) */
  level?: number;
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
  const [dynamicSections, setDynamicSections] = useState<Array<{ id: string; label: string; level: number }>>([]);
  const dynamicSectionsRef = useRef<Array<{ id: string; label: string; level: number }>>([]);

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
      // ── Stamp h1/h2/h3 headings inside TipTap editor body only ────────────
      // Scoped to .ProseMirror so the post title (outside TipTap) is excluded.
      const tiptapRoot = document.querySelector(".ProseMirror");
      if (tiptapRoot) {
        // Only h2/h3 — h1 is the post title level and should never appear in the TOC
        const rawHeadings = tiptapRoot.querySelectorAll(
          "h2:not([data-flow]), h3:not([data-flow])"
        );
        const usedIds = new Set<string>();
        rawHeadings.forEach((el) => {
          const text = (el.textContent || "").trim();
          if (!text) return;
          const slug = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40) || "heading";
          let flowId = `h-${slug}`;
          let n = 1;
          while (usedIds.has(flowId)) flowId = `h-${slug}-${n++}`;
          usedIds.add(flowId);
          const lvl = parseInt(el.tagName[1], 10);
          el.setAttribute("data-flow", flowId);
          el.setAttribute("data-flow-label", text);
          el.setAttribute("data-flow-level", String(lvl));
          if (!el.id) el.id = flowId;
        });
      }
      // ───────────────────────────────────────────────────────────────────────

      const elements = document.querySelectorAll("[data-flow]");
      const foundStates: Record<string, boolean> = {};

      sectionConfig.forEach((s) => {
        foundStates[s.id] = false;
      });

      const configIds = new Set(sectionConfig.map((s) => s.id));
      const newDynamic: Array<{ id: string; label: string; level: number }> = [];

      elements.forEach((el) => {
        const flowId = el.getAttribute("data-flow");
        if (!flowId) return;

        if (!observedElements.current.has(el)) {
          observerRef.current?.observe(el);
          observedElements.current.add(el);
        }

        if (configIds.has(flowId)) {
          foundStates[flowId] = true;
        } else {
          // Dynamic section (e.g., heading from TipTap renderer)
          const label = el.getAttribute("data-flow-label");
          const levelAttr = el.getAttribute("data-flow-level");
          if (label) {
            newDynamic.push({ id: flowId, label, level: levelAttr ? parseInt(levelAttr, 10) : 1 });
          }
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

      // Update dynamic sections if changed
      const dynamicChanged =
        newDynamic.length !== dynamicSectionsRef.current.length ||
        newDynamic.some(
          (d, i) =>
            d.id !== dynamicSectionsRef.current[i]?.id ||
            d.label !== dynamicSectionsRef.current[i]?.label ||
            d.level !== dynamicSectionsRef.current[i]?.level
        );
      if (dynamicChanged) {
        dynamicSectionsRef.current = newDynamic;
        setDynamicSections(newDynamic);
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

    // Scope MutationObserver to lesson content container
    const contentRoot =
      document.querySelector("[data-lesson-content]") ?? document.body;

    // Debounce mutations — avoids calling observeFlowElements on every keystroke
    // or animation frame. 200ms is fast enough to catch dynamically rendered content.
    let mutationTimer: number | null = null;
    const mutationObserver = new MutationObserver(() => {
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(observeFlowElements, 200);
    });

    // Watch childList only — NOT attributes/attributeFilter["data-flow"].
    // We are the ones stamping data-flow, so watching for it creates a feedback loop
    // that pegs the CPU (each stamp fires the observer, which re-stamps, repeat).
    mutationObserver.observe(contentRoot, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (mutationTimer) clearTimeout(mutationTimer);
      if (hysteresisTimer.current) {
        clearTimeout(hysteresisTimer.current);
      }
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
      ratioMap.current.clear();
      observedElements.current.clear();
    };
  }, [sectionConfig, scheduleUpdate]); // scheduleUpdate is stable now

  // Build enriched sections: configured (with greyed-out support) + dynamic headings
  const configuredSections: LessonFlowSection[] = sectionConfig.map((section) => ({
    id: section.id,
    label: section.label,
    exists: sectionStates[section.id] ?? false,
    isDynamic: false,
  }));

  const discoveredSections: LessonFlowSection[] = dynamicSections.map((s) => ({
    id: s.id,
    label: s.label,
    exists: true,
    isDynamic: true,
    level: s.level,
  }));

  // If dynamic heading sections exist, suppress greyed-out configured sections
  // so a TipTap lesson doesn't show disabled Chat Bubbles / Cause & Effect items.
  const sections: LessonFlowSection[] = discoveredSections.length > 0
    ? [...configuredSections.filter((s) => s.exists), ...discoveredSections]
    : configuredSections;

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
