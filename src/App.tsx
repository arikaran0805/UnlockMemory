import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewAsRoleProvider } from "@/contexts/ViewAsRoleContext";
import { PricingDrawerProvider } from "@/contexts/PricingDrawerContext";
import { CareerPlanProvider } from "@/contexts/CareerPlanContext";
import ViewAsRoleBanner from "@/components/ViewAsRoleBanner";


// Import unified TipTap styles
import "@/styles/tiptap.css";

// Route Compositions
import { AdminRoutes, SuperModeratorRoutes, SeniorModeratorRoutes, ModeratorRoutes, CareerBoardRoutes, publicRoutes } from "@/routes";

const queryClient = new QueryClient();

const AppContent = () => {
  usePageTracking();
  const { user } = useAuth();
  usePresence(user?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const prevLocationRef = useRef(location.pathname);

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
      <ViewAsRoleBanner />
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
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <ViewAsRoleProvider>
              <CareerPlanProvider>
                <PricingDrawerProvider>
                  <AppContent />
                </PricingDrawerProvider>
              </CareerPlanProvider>
            </ViewAsRoleProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
