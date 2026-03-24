/**
 * useUserState Hook
 * 
 * Determines user state: guest, learner, or pro
 * Also tracks entry source for conditional UI behavior
 * 
 * ENTRY FLOW SYSTEM:
 * - "career_flow": Set ONLY by Career Readiness / Career Board interactions
 * - undefined/null: Default - always shows Global Header
 * 
 * CRITICAL RULES:
 * - CareerScopedHeader renders ONLY when entryFlow === "career_flow"
 * - Page refresh, direct URL, browser back/forward clear career flow
 * - Course pages NEVER set entryFlow - only Career Readiness CTAs do
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type UserState = "guest" | "learner" | "pro";
export type EntrySource = "external" | "internal";
export type EntryFlow = "career_flow" | null;

interface Subscription {
  id: string;
  status: string;
  plan: string;
  current_period_end: string | null;
}

interface UseUserStateReturn {
  /** Current user state: guest, learner, or pro */
  userState: UserState;
  /** Entry source: external (SEO, course cards) or internal (dashboard, library) */
  entrySource: EntrySource;
  /** Entry flow: "career_flow" (from Career Readiness/Board) or null (default) */
  entryFlow: EntryFlow;
  /** Raw subscription data if available */
  subscription: Subscription | null;
  /** Whether subscription data is still loading */
  isLoading: boolean;
  /** Check if user is a guest */
  isGuest: boolean;
  /** Check if user is a free learner */
  isLearner: boolean;
  /** Check if user is a pro/paid user */
  isPro: boolean;
  /** Check if ads should be shown */
  shouldShowAds: boolean;
  /** Check if pro features should be shown */
  shouldShowProFeatures: boolean;
  /** Whether CareerScopedHeader should be shown (ONLY when in career flow) */
  isCareerFlow: boolean;
  /** Mark the current session as internal navigation */
  markAsInternal: () => void;
  /** Set career flow - ONLY call from Career Readiness / Career Board CTAs */
  setCareerFlow: () => void;
  /** Clear career flow - called on page unload, refresh, or explicit exit */
  clearCareerFlow: () => void;
}

// Session storage keys
const ENTRY_SOURCE_KEY = "lovable_entry_source";
const ENTRY_FLOW_KEY = "lovable_entry_flow";
const INTERNAL_ROUTES = ["/profile", "/dashboard", "/moderator", "/admin", "/senior-moderator", "/super-moderator"];

/**
 * Detect if the user arrived from an internal route
 */
const detectEntrySource = (): EntrySource => {
  // Check session storage first (persists during session)
  const storedSource = sessionStorage.getItem(ENTRY_SOURCE_KEY);
  if (storedSource === "internal") return "internal";

  // Check referrer
  const referrer = document.referrer;
  if (referrer) {
    try {
      const referrerUrl = new URL(referrer);
      const currentHost = window.location.host;
      
      // If referrer is from same host, check if it's an internal route
      if (referrerUrl.host === currentHost) {
        const isInternalRoute = INTERNAL_ROUTES.some(route => 
          referrerUrl.pathname.startsWith(route)
        );
        if (isInternalRoute) {
          sessionStorage.setItem(ENTRY_SOURCE_KEY, "internal");
          return "internal";
        }
      }
    } catch {
      // Invalid referrer URL, treat as external
    }
  }

  return "external";
};

/**
 * Get entry flow from session storage
 * Returns null if not set or on page refresh (uses sessionStorage pageshow handling)
 */
const getEntryFlow = (): EntryFlow => {
  const stored = sessionStorage.getItem(ENTRY_FLOW_KEY);
  return stored === "career_flow" ? "career_flow" : null;
};

export const useUserState = (): UseUserStateReturn => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [entrySource, setEntrySource] = useState<EntrySource>(() => detectEntrySource());
  const [entryFlow, setEntryFlowState] = useState<EntryFlow>(() => getEntryFlow());

  // Safety timeout: if subscription loading takes more than 5 seconds, force it to complete
  useEffect(() => {
    if (!subscriptionLoading) return;
    
    const timeout = setTimeout(() => {
      if (subscriptionLoading) {
        console.warn("useUserState: Subscription loading timeout, forcing completion");
        setSubscriptionLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [subscriptionLoading]);

  // Handle bfcache (back-forward cache) navigation - career flow persists on refresh
  // but clears on back/forward navigation to prevent stale career context
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache (back/forward navigation)
        // Re-read the entry flow from sessionStorage to sync state
        const storedFlow = getEntryFlow();
        setEntryFlowState(storedFlow);
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      // CRITICAL: Don't set subscriptionLoading to false while auth is still loading
      // This prevents premature "not pro" state during page refresh
      if (authLoading) {
        return; // Wait for auth to complete first
      }

      if (!user) {
        setSubscription(null);
        setSubscriptionLoading(false);
        return;
      }

      // User exists, fetch subscription
      setSubscriptionLoading(true);
      
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, status, plan, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching subscription:", error);
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      } catch (err) {
        console.error("Subscription fetch failed:", err);
        setSubscription(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, [user, authLoading]);

  // Determine user state
  const userState = useMemo((): UserState => {
    if (!isAuthenticated || !user) return "guest";
    
    // Check for active pro subscription
    if (subscription?.status === "active" && subscription?.plan === "pro") {
      // Also check if subscription hasn't expired
      if (subscription.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        if (endDate > new Date()) {
          return "pro";
        }
      } else {
        // No end date means it's active
        return "pro";
      }
    }
    
    // Trialing counts as pro
    if (subscription?.status === "trialing") {
      return "pro";
    }

    return "learner";
  }, [isAuthenticated, user, subscription]);

  // Derived states
  const isGuest = userState === "guest";
  const isLearner = userState === "learner";
  const isPro = userState === "pro";
  
  // Ads shown for guests and free learners only
  const shouldShowAds = userState !== "pro";
  
  // Pro features for pro users only
  const shouldShowProFeatures = isPro;

  // Career flow is ONLY true when explicitly set by Career Readiness/Board interactions
  // This is the SINGLE SOURCE OF TRUTH for header rendering
  const isCareerFlow = entryFlow === "career_flow";

  // Mark current session as internal navigation
  const markAsInternal = useCallback(() => {
    sessionStorage.setItem(ENTRY_SOURCE_KEY, "internal");
    setEntrySource("internal");
  }, []);

  // Set career flow - ONLY called from Career Readiness / Career Board CTAs
  const setCareerFlow = useCallback(() => {
    sessionStorage.setItem(ENTRY_FLOW_KEY, "career_flow");
    setEntryFlowState("career_flow");
  }, []);

  // Clear career flow - called when exiting career mode or on refresh
  const clearCareerFlow = useCallback(() => {
    sessionStorage.removeItem(ENTRY_FLOW_KEY);
    setEntryFlowState(null);
  }, []);

  const isLoading = authLoading || subscriptionLoading;

  return {
    userState,
    entrySource,
    entryFlow,
    subscription,
    isLoading,
    isGuest,
    isLearner,
    isPro,
    shouldShowAds,
    shouldShowProFeatures,
    isCareerFlow,
    markAsInternal,
    setCareerFlow,
    clearCareerFlow,
  };
};

export default useUserState;
