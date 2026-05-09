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
  /**
   * Pass the current lessonId here. When this value changes the hook
   * resets all stale state (activeFlow, dynamicSections, sectionStates)
   * and re-attaches observers to the current [data-lesson-content] element,
   * which may have been remounted by React during lesson navigation.
   */
  resetKey?: string;
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
 * - Resets cleanly when resetKey (lessonId) changes
 */
export function useLessonFlowNavigation(
  sectionConfig: Array<{ id: string; label: string }>,
  options: UseLessonFlowNavigationOptions = {}
) {
  const { scrollOffset = 140, hysteresisMs = 80, resetKey } = options;

  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});
  const [dynamicSections, setDynamicSections] = useState<Array<{ id: string; label: string; level: number }>>([]);
  const dynamicSectionsRef = useRef<Array<{ id: string; label: string; level: number }>>([]);

  const ratioMap = useRef<Map<string, number>>(new Map());
  const hysteresisTimer = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElements = useRef<Set<Element>>(new Set());

  // Stored in refs so the reset effect can disconnect/reconnect without
  // needing access to the main effect's local variables.
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const mutationTimerRef = useRef<number | null>(null);
  const mutationTimer2Ref = useRef<number | null>(null);

  // Ref to observeFlowElements so it can be called from the reset effect,
  // which runs after the main effect and can't close over its locals.
  const observeFlowElementsRef = useRef<() => void>(() => {});

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

  // Resolve active section by scroll position — "last [data-flow] element whose
  // top edge is at or above the reading line".
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
    return activeId ?? elements[0].getAttribute("data-flow");
  }, [scrollOffset]);

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
  }, [resolveDominant, hysteresisMs]);

  const scheduleUpdateRef = useRef(scheduleUpdate);
  scheduleUpdateRef.current = scheduleUpdate;

  // Scroll listener
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

  // Single IntersectionObserver setup — only recreated when sectionConfig changes by value
  useEffect(() => {
    // Fix 4: bail out if config values are identical
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
    observerRef.current = new IntersectionObserver(
      () => { scheduleUpdateRef.current(); },
      {
        root: null,
        rootMargin: "0px 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 1],
      }
    );

    // ── observeFlowElements ──────────────────────────────────────────────────
    // Defined inside the effect so it closes over sectionConfig, but also
    // stored in observeFlowElementsRef so the reset effect can call it.
    const observeFlowElements = () => {
      // Clean up stale entries from previous lesson navigation
      Array.from(observedElements.current).forEach((el) => {
        if (!document.contains(el)) {
          observerRef.current?.unobserve(el);
          observedElements.current.delete(el);
        }
      });

      // Stamp h2/h3 in ALL visible TipTap roots
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

    // Expose for reset effect
    observeFlowElementsRef.current = observeFlowElements;

    // Initial observation
    observeFlowElements();

    // rAF pass: catches sections visible after first paint
    const rafId = requestAnimationFrame(() => {
      observeFlowElements();
    });

    // Scope MutationObserver to lesson content container
    const contentRoot =
      document.querySelector("[data-lesson-content]") ?? document.body;

    const mutationObserver = new MutationObserver(() => {
      if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current);
      if (mutationTimer2Ref.current) clearTimeout(mutationTimer2Ref.current);
      mutationTimerRef.current = window.setTimeout(() => {
        observeFlowElementsRef.current();
        mutationTimer2Ref.current = window.setTimeout(() => observeFlowElementsRef.current(), 400);
      }, 200);
    });

    mutationObserver.observe(contentRoot, {
      childList: true,
      subtree: true,
    });
    mutationObserverRef.current = mutationObserver;

    return () => {
      cancelAnimationFrame(rafId);
      if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current);
      if (mutationTimer2Ref.current) clearTimeout(mutationTimer2Ref.current);
      if (hysteresisTimer.current) {
        clearTimeout(hysteresisTimer.current);
      }
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
      mutationObserverRef.current = null;
      ratioMap.current.clear();
      observedElements.current.clear();
    };
  }, [sectionConfig]);

  // ── Reset effect ───────────────────────────────────────────────────────────
  // Fires when the lesson changes (resetKey = lessonId).
  // Clears stale TOC state and re-attaches observers to the new
  // [data-lesson-content] element, which React may have remounted.
  useEffect(() => {
    if (resetKey === undefined) return;

    // 1. Wipe all state that belongs to the previous lesson
    setActiveFlow(null);
    activeFlowRef.current = null;
    setDynamicSections([]);
    dynamicSectionsRef.current = [];
    setSectionStates({});
    sectionStatesRef.current = {};

    // 2. Reset IntersectionObserver (observed elements are gone)
    observerRef.current?.disconnect();
    ratioMap.current.clear();
    observedElements.current.clear();

    observerRef.current = new IntersectionObserver(
      () => { scheduleUpdateRef.current(); },
      { root: null, rootMargin: "0px 0px -40% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    // 3. Re-attach MutationObserver to the CURRENT [data-lesson-content].
    //    If React unmounted the old element and mounted a new one, the
    //    previous observer was watching a detached node and silently dropped
    //    all mutations. Reconnecting here ensures we catch new content.
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
    }
    if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current);
    if (mutationTimer2Ref.current) clearTimeout(mutationTimer2Ref.current);

    const contentRoot = document.querySelector("[data-lesson-content]") ?? document.body;
    const newMO = new MutationObserver(() => {
      if (mutationTimerRef.current) clearTimeout(mutationTimerRef.current);
      if (mutationTimer2Ref.current) clearTimeout(mutationTimer2Ref.current);
      mutationTimerRef.current = window.setTimeout(() => {
        observeFlowElementsRef.current();
        mutationTimer2Ref.current = window.setTimeout(() => observeFlowElementsRef.current(), 400);
      }, 200);
    });
    newMO.observe(contentRoot, { childList: true, subtree: true });
    mutationObserverRef.current = newMO;

    // 4. Scan immediately in case new content is already in the DOM,
    //    then again at two delays for async-loading TipTap content.
    observeFlowElementsRef.current();
    const rafId = requestAnimationFrame(() => observeFlowElementsRef.current());
    const t1 = window.setTimeout(() => observeFlowElementsRef.current(), 250);
    const t2 = window.setTimeout(() => observeFlowElementsRef.current(), 600);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  // sectionConfig intentionally omitted — handled by the main effect above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

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
  const sections: LessonFlowSection[] = discoveredSections.length > 0
    ? [...configuredSections.filter((s) => s.exists), ...discoveredSections]
    : configuredSections;

  // Scroll to section — fast 250 ms cubic ease-out
  const scrollToSection = useCallback(
    (flowId: string) => {
      const element = document.querySelector(`[data-flow="${flowId}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - scrollOffset;
      const startY = window.scrollY;
      const distance = targetY - startY;

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
