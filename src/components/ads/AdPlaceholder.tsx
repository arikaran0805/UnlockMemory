import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// Global flag to prevent duplicate script injection
let scriptLoading = false;
let scriptLoaded = false;
let scriptError = false;

/**
 * Load AdSense script globally (once) without client param in URL
 * Per AdSense policy: script URL should not include client query parameter
 */
const loadAdSenseScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (scriptLoaded) {
      resolve();
      return;
    }

    if (scriptError) {
      reject(new Error("AdSense script previously failed to load"));
      return;
    }

    if (scriptLoading) {
      // Wait for existing script to load
      const checkInterval = setInterval(() => {
        if (scriptLoaded) {
          clearInterval(checkInterval);
          resolve();
        }
        if (scriptError) {
          clearInterval(checkInterval);
          reject(new Error("AdSense script failed to load"));
        }
      }, 100);
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    );
    if (existingScript) {
      scriptLoaded = true;
      resolve();
      return;
    }

    scriptLoading = true;

    const script = document.createElement("script");
    // Do NOT append client query parameter to script URL per AdSense guidelines
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    script.async = true;
    script.crossOrigin = "anonymous";

    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
    };

    script.onerror = () => {
      scriptLoading = false;
      scriptError = true;
      reject(new Error("Failed to load AdSense script"));
    };

    document.head.appendChild(script);
  });
};

interface AdPlaceholderProps {
  googleAdSlot?: string;
  googleAdClient?: string;
  adType?: "sidebar" | "in-content" | "banner";
  className?: string;
}

/**
 * AdPlaceholder Component
 * 
 * Renders Google AdSense ads following all AdSense policies:
 * - Script loads once globally without client param
 * - Only <ins> element contains data-ad-* attributes
 * - Test mode enabled automatically in non-production
 * - Collapses silently on errors
 * - Guards against remounts and double initialization
 */
const AdPlaceholder = ({
  googleAdSlot,
  googleAdClient,
  adType = "sidebar",
  className = "",
}: AdPlaceholderProps) => {
  const insRef = useRef<HTMLModElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);

  // Detect non-production environment for test mode
  const isTestMode = import.meta.env.DEV || 
    window.location.hostname.includes("preview") ||
    window.location.hostname.includes("localhost");

  // Validate credentials - must have real values, not placeholders
  const hasValidCredentials =
    googleAdSlot &&
    googleAdClient &&
    !googleAdClient.includes("XXXXXXXX") &&
    googleAdSlot !== "1234567890" &&
    googleAdSlot.trim() !== "" &&
    googleAdClient.trim() !== "";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load script and initialize ad
  useEffect(() => {
    if (!hasValidCredentials || initializedRef.current) {
      return;
    }

    const initializeAd = async () => {
      try {
        await loadAdSenseScript();

        // Guard against unmounted component
        if (!mountedRef.current) return;

        // Guard against double initialization
        if (initializedRef.current) return;

        // Ensure ins element exists and is in DOM
        if (!insRef.current || !document.body.contains(insRef.current)) return;

        // Mark as initialized before push to prevent race conditions
        initializedRef.current = true;

        // Initialize this specific ad slot
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        // Collapse silently on error - no console errors exposed
        if (mountedRef.current) {
          setIsVisible(false);
        }
      }
    };

    initializeAd();
  }, [hasValidCredentials]);

  // Don't render if collapsed due to error
  if (!isVisible) {
    return null;
  }

  // Show dev placeholder when no valid credentials
  if (!hasValidCredentials) {
    if (!isTestMode) return null;
    return (
      <div
        className={`rounded-lg border border-dashed border-border/60 bg-muted/20 flex items-center justify-center min-h-[250px] ${className}`}
      >
        <span className="text-[11px] text-muted-foreground/50 select-none">
          Ad Slot Preview
        </span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
        }}
        data-ad-client={googleAdClient}
        data-ad-slot={googleAdSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(isTestMode && { "data-adtest": "on" })}
      />
    </div>
  );
};

export default AdPlaceholder;
