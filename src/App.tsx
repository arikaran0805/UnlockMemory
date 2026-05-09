import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Component, type ReactNode, type ErrorInfo, useEffect, useRef } from "react";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewAsRoleProvider } from "@/contexts/ViewAsRoleContext";
import { PricingDrawerProvider } from "@/contexts/PricingDrawerContext";
import { CareerPlanProvider } from "@/contexts/CareerPlanContext";
import { PlatformSettingsProvider } from "@/contexts/PlatformSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { NAV_COURSES_KEY, fetchNavCourses } from "@/hooks/useNavCourses";
import { NAV_CAREERS_KEY, fetchNavCareers } from "@/hooks/useNavCareers";



// Import unified TipTap styles
import "@/styles/tiptap.css";

// Route Compositions
import { AdminRoutes, SuperModeratorRoutes, SeniorModeratorRoutes, ModeratorRoutes, CareerBoardRoutes, publicRoutes } from "@/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes — no refetch on every mount
      staleTime: 5 * 60 * 1000,
      // Keep cache for 10 minutes after component unmounts
      gcTime: 10 * 60 * 1000,
      // Never refetch just because the user switched tabs and came back
      refetchOnWindowFocus: false,
      // Don't hammer the server on reconnect for catalog/nav data
      refetchOnReconnect: false,
      // One retry is enough for transient errors
      retry: 1,
    },
  },
});

// Global Error Boundary — catches any render crash anywhere in the app tree.
// Without this, an unhandled rejection or render error causes a full white page.
interface AppErrorBoundaryState { hasError: boolean; message: string }
class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, message: "" };
  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary] Uncaught render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "sans-serif" }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>Something went wrong</h2>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem" }}>{this.state.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false, message: "" }); window.location.reload(); }}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.375rem", background: "#111827", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fire nav data prefetch immediately at module load — before any React component
// mounts. By the time the Header renders and calls useNavCourses/useNavCareers,
// the data is already in-flight (or fully cached), making the secondary header
// and nav dropdowns appear instantly with zero perceived delay.
queryClient.prefetchQuery({ queryKey: NAV_COURSES_KEY, queryFn: fetchNavCourses, staleTime: 15 * 60 * 1000 });
queryClient.prefetchQuery({ queryKey: NAV_CAREERS_KEY, queryFn: fetchNavCareers, staleTime: 15 * 60 * 1000 });

const AppContent = () => {
  usePageTracking();
  const { user } = useAuth();
  usePresence(user?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const prevLocationRef = useRef(location.pathname);

  // ── Redirect rules engine ──────────────────────────────────────────────────
  // Fetch all active redirect rules once on mount, store in a ref so we never
  // re-query on every navigation.
  const redirectRulesRef = useRef<{ source_path: string; destination_url: string }[]>([]);

  useEffect(() => {
    supabase
      .from("redirects")
      .select("source_path, destination_url")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) redirectRulesRef.current = data;
      });
  }, []);

  useEffect(() => {
    const match = redirectRulesRef.current.find(
      (r) => r.source_path === location.pathname
    );
    if (!match) return;

    const dest = match.destination_url;
    if (dest.startsWith("http://") || dest.startsWith("https://")) {
      window.location.href = dest;   // external URL — full browser redirect
    } else {
      navigate(dest, { replace: true }); // internal path — React Router redirect
    }
  }, [location.pathname, navigate]);
  // ──────────────────────────────────────────────────────────────────────────

  // If user opens an email recovery link, redirect to the dedicated /reset-password page.
  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(location.search);

    const type = hashParams.get("type") ?? searchParams.get("type");
    const hasRecoveryTokens = hashParams.has("access_token") && hashParams.has("refresh_token");
    const hasRecoveryCode = searchParams.has("code");

    if (
      (type === "recovery" || (hasRecoveryTokens && !type) || (hasRecoveryCode && !type)) &&
      location.pathname !== "/reset-password"
    ) {
      navigate(`/reset-password${location.search}${location.hash}`, { replace: true });
    }
  }, [location.hash, location.search, location.pathname, navigate]);

  // Prevent scroll to top when navigating between admin/moderator pages
  useEffect(() => {
    const prevPath = prevLocationRef.current;
    const currentPath = location.pathname;
    
    const isAdminPath = (path: string) => 
      path.startsWith('/admin') || 
      path.startsWith('/super-moderator') ||
      path.startsWith('/senior-moderator') || 
      path.startsWith('/moderator');
    
    const bothAreAdminPaths = isAdminPath(prevPath) && isAdminPath(currentPath);
    
    if (!bothAreAdminPaths && !isAdminPath(currentPath)) {
      window.scrollTo(0, 0);
    }
    
    prevLocationRef.current = currentPath;
  }, [location.pathname]);
  
  return (
    <>
      <Toaster />
      <Sonner />
      <Routes>
        {/* Public Routes */}
        {publicRoutes}

        {/* Role Routes - Each role has ONE root route with index routes */}
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/super-moderator/*" element={<SuperModeratorRoutes />} />
        <Route path="/senior-moderator/*" element={<SeniorModeratorRoutes />} />
        <Route path="/moderator/*" element={<ModeratorRoutes />} />
        
        {/* Career Board - Dedicated shell for career-scoped learning */}
        <Route path="/career-board/:careerId/*" element={<CareerBoardRoutes />} />
      </Routes>
    </>
  );
};

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <ViewAsRoleProvider>
                <PlatformSettingsProvider>
                  <CareerPlanProvider>
                    <PricingDrawerProvider>
                      <AppContent />
                    </PricingDrawerProvider>
                  </CareerPlanProvider>
                </PlatformSettingsProvider>
              </ViewAsRoleProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
