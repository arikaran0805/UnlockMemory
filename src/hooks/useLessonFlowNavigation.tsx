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

  // Guaranteed hysteresis cleanup on unmount
  useEffect(() => {
    return () => {
      if (hysteresisTimer.current) {
        clearTimeout(hysteresisTimer.current);
      }
    };
  }, []);

  // Scroll listener — drives active section as the user scrolls.
  // IntersectionObserver only fires when elements cross viewport boundaries;
  // it won't update while scrolling *between* two headings. The scroll listener
  // fills that gap by calling scheduleUpdate on every scroll frame.
  useEffect(() => {
    let rafPending = false;
    const onScroll = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        scheduleUpdate();
        rafPending = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scheduleUpdate]);

  // Resolve active section by scroll position — "last [data-flow] element whose
  // top edge is at or above the reading line".  This is the standard TOC algorithm
  // (Claude docs, MDN, etc.) and is far more reliable than IntersectionObserver
  // ratio comparison, which breaks whenever a large block element (e.g. the Chat
  // Bubbles container) scores higher than the small heading currently in view.
  const resolveDominant = useCallback((): string | null => {
    const elements = Array.from(document.querySelectorAll("[data-flow]"));
    if (elements.length === 0) return null;

    let activeId: string | null = null;
    for (const el of elements) {
      const top = (el as HTMLElement).getBoundingClientRect().top;
      if (top <= scrollOffset + 20) {
        activeId = el.getAttribute("data-flow");
      }
    }
    // Nothing above the reading line yet → first section
    return activeId ?? elements[0].getAttribute("data-flow");
  }, [scrollOffset]);

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
    // IntersectionObserver is kept for section existence detection only.
    // Active section is now driven by the scroll listener + resolveDominant
    // (scroll-position based), so we no longer need ratio tracking here.
    observerRef.current = new IntersectionObserver(
      () => { scheduleUpdate(); },
      {
        root: null,
        rootMargin: "0px 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 1],
      }
    );

    // Find and observe all [data-flow] elements
    const observeFlowElements = () => {
      // ── Clean up stale entries from previous lesson navigation ─────────────
      Array.from(observedElements.current).forEach((el) => {
        if (!document.contains(el)) {
          observerRef.current?.unobserve(el);
          observedElements.current.delete(el);
        }
      });

      // ── Stamp h2/h3 in ALL visible TipTap roots ───────────────────────────
      // querySelectorAll catches every .ProseMirror — canvas lessons have one
      // per text block.  offsetParent !== null excludes hidden editors (Notes
      // panel stays mounted but display:none after lazy-mount).
      let allRoots = Array.from(
        document.querySelectorAll("[data-lesson-content] .ProseMirror")
      ).filter((el) => (el as HTMLElement).offsetParent !== null);

      if (allRoots.length === 0) {
        allRoots = Array.from(document.querySelectorAll(".ProseMirror")).filter(
          (el) => (el as HTMLElement).offsetParent !== null
        );
      }

      allRoots.forEach((root) => {
        root.querySelectorAll("h1[data-flow]").forEach((h1) => {
          h1.removeAttribute("data-flow");
          h1.removeAttribute("data-flow-label");
          h1.removeAttribute("data-flow-level");
        });
      });

      // Shared usedIds across all roots — no slug collisions between canvas blocks
      const usedIds = new Set<string>();
      allRoots.forEach((tiptapRoot) => {
        tiptapRoot.querySelectorAll("h2:not([data-flow]), h3:not([data-flow])").forEach((el) => {
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
      });
      // ─────────────────────────────────────────────────────────────────────

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

    // Debounce mutations. Two passes: 200 ms catches React-rendered content;
    // +400 ms is a safety net for lessons that async-load their body.
    let mutationTimer: number | null = null;
    let mutationTimer2: number | null = null;
    const mutationObserver = new MutationObserver(() => {
      if (mutationTimer) clearTimeout(mutationTimer);
      if (mutationTimer2) clearTimeout(mutationTimer2);
      mutationTimer = window.setTimeout(() => {
        observeFlowElements();
        mutationTimer2 = window.setTimeout(observeFlowElements, 400);
      }, 200);
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
      if (mutationTimer2) clearTimeout(mutationTimer2);
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

  // Scroll to section — fast 250 ms cubic ease-out (browser "smooth" is ~1 s)
  const scrollToSection = useCallback(
    (flowId: string) => {
      const element = document.querySelector(`[data-flow="${flowId}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - scrollOffset;
      const startY = window.scrollY;
      const distance = targetY - startY;

      // Immediately set active for snappy visual feedback
      activeFlowRef.current = flowId;
      setActiveFlow(flowId);

      if (Math.abs(distance) < 2) return;

      const DURATION = 250;
      const startTime = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / DURATION, 1);
        window.scrollTo(0, startY + distance * easeOutCubic(progress));
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
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
