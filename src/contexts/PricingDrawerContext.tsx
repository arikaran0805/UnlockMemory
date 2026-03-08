/**
 * PricingDrawerContext
 * 
 * Global context for managing the Pricing Drawer state.
 * Provides open/close functionality and tracks analytics events.
 */
import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useUserState } from "@/hooks/useUserState";

interface PricingDrawerContextType {
  isOpen: boolean;
  openPricingDrawer: (source?: string) => void;
  closePricingDrawer: (upgraded?: boolean) => void;
  triggerSource: string | null;
}

const PricingDrawerContext = createContext<PricingDrawerContextType | undefined>(undefined);

export const PricingDrawerProvider = ({ children }: { children: ReactNode }) => {
  const { isPro } = useUserState();
  const navigate = useNavigate();

  const openPricingDrawer = useCallback((source?: string) => {
    if (isPro) return;
    console.log("[Analytics] Pricing page opened", { source });
    navigate("/choose-plan");
  }, [isPro, navigate]);

  const closePricingDrawer = useCallback((_upgraded?: boolean) => {
    // No-op: kept for API compatibility
  }, []);

  return (
    <PricingDrawerContext.Provider
      value={{
        isOpen: false,
        openPricingDrawer,
        closePricingDrawer,
        triggerSource: null,
      }}
    >
      {children}
    </PricingDrawerContext.Provider>
  );
};

export const usePricingDrawer = () => {
  const context = useContext(PricingDrawerContext);
  if (context === undefined) {
    throw new Error("usePricingDrawer must be used within a PricingDrawerProvider");
  }
  return context;
};

export default PricingDrawerContext;
