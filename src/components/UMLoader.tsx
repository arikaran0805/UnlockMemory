interface UMLoaderProps {
  size?: number;
  dark?: boolean;
  label?: string | null;
}

/**
 * UnlockMemory branded loader.
 * Uses currentColor so the color is driven by the CSS `color` property —
 * pass dark=true to use the design-system primary (hsl(var(--primary))),
 * or omit for the darker teal fallback used on light backgrounds.
 */
export default function UMLoader({ size = 48, dark = false, label = null }: UMLoaderProps) {
  // Use CSS variable so the loader always matches the design system primary,
  // regardless of future theme changes. currentColor in SVG inherits this.
  const cssColor = dark ? "hsl(var(--primary))" : "#0F6E56";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: cssColor }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 140 140"
        fill="none"
      >
        <path
          className="um-arc"
          d="M37.11,45.57 A26,26 0 1,1 21.57,61.11"
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <rect className="um-bar" x="72" y="64.5" width="54" height="11" rx="5.5" fill="currentColor" />
        <circle className="um-d1" cx="103" cy="83" r="5.5" fill="currentColor" />
        <circle className="um-d2" cx="117" cy="82.5" r="5.0" fill="currentColor" />
      </svg>
      {label && (
        <span
          style={{
            fontSize: 11,
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
