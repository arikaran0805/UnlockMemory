/**
 * SidebarToggleHeader — premium brand anchor header for all role sidebars.
 * Only touches the top header row — no routing, nav, or sidebar logic changed.
 *
 * Expanded:  [Dark gradient logo tile] ─────── [Collapse button]
 * Collapsed: [Same logo tile centered, full click target]
 *            └─ hover → scale + logo fades → expand icon reveals
 */
import { useState, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

// Logo tile entry delay — sidebar width transitions over 300ms,
// wait 180ms so logo fades in smoothly instead of popping in.
const LOGO_ENTRY_DELAY = 180;

interface Props {
  isOpen:   boolean;
  onToggle: () => void;
}

const SidebarToggleHeader = ({ isOpen, onToggle }: Props) => {
  const [hovered,     setHovered]     = useState(false);
  const [logoVisible, setLogoVisible] = useState(!isOpen);

  useEffect(() => {
    if (!isOpen) {
      setLogoVisible(false);
      const t = setTimeout(() => setLogoVisible(true), LOGO_ENTRY_DELAY);
      return () => clearTimeout(t);
    } else {
      setLogoVisible(false);
      setHovered(false);
    }
  }, [isOpen]);

  // ── Collapsed ─────────────────────────────────────────────────────────────
  if (!isOpen) {
    const logoOpacity = hovered ? 0 : logoVisible ? 1 : 0;

    return (
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          paddingTop:     "12px",
          paddingBottom:  "8px",
        }}
      >
        <button
          onClick={onToggle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label="Open sidebar"
          style={{
            position:        "relative",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            width:           "40px",
            height:          "40px",
            borderRadius:    "10px",
            background:      "transparent",
            border:          "none",
            cursor:          "pointer",
            padding:         0,
            transform:       hovered ? "scale(1.04)" : "scale(1)",
            transition:      "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          {/* Brand logo — fades in after sidebar collapses, fades out on hover */}
          <img
            src="/unlockMemory_icon.svg"
            alt=""
            draggable={false}
            aria-hidden="true"
            style={{
              position:   "absolute",
              width:      "30px",
              height:     "30px",
              opacity:    logoOpacity,
              transition: "opacity 0.18s ease",
              filter:     "brightness(0) saturate(100%) invert(28%) sepia(20%) saturate(800%) hue-rotate(95deg) brightness(85%)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />

          {/* Expand affordance — white, fades in on hover */}
          <PanelLeftOpen
            aria-hidden="true"
            style={{
              position:   "absolute",
              width:      "16px",
              height:     "16px",
              color:      "#6B8F71",
              opacity:    hovered ? 1 : 0,
              transition: "opacity 0.18s ease",
            }}
          />
        </button>
      </div>
    );
  }

  // ── Expanded ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        paddingTop:     "12px",
        paddingBottom:  "8px",
        paddingLeft:    "4px",
        paddingRight:   "4px",
      }}
    >
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
          width:          "40px",
          height:         "40px",
        }}
      >
        <img
          src="/unlockMemory_icon.svg"
          alt="UnlockMemory"
          draggable={false}
          style={{
            width:         "34px",
            height:        "34px",
            filter:        "brightness(0) saturate(100%) invert(28%) sepia(20%) saturate(800%) hue-rotate(95deg) brightness(85%)",
            userSelect:    "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── Collapse button ── */}
      <button
        onClick={onToggle}
        aria-label="Collapse sidebar"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#E2EAE1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.background = "#D4DDD3";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.background = "#E2EAE1";
        }}
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          width:           "34px",
          height:          "34px",
          borderRadius:    "10px",
          background:      "transparent",
          border:          "none",
          cursor:          "pointer",
          color:           "#6B8F71",
          padding:         0,
          transition:      "background 0.2s ease, color 0.2s ease",
        }}
      >
        <PanelLeftClose
          aria-hidden="true"
          style={{ width: "16px", height: "16px" }}
        />
      </button>
    </div>
  );
};

export default SidebarToggleHeader;
