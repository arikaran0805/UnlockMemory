type BadgeVariant = "success" | "error" | "pending" | "active" | "inactive" | "warning" | "failing";

interface Props {
  variant: BadgeVariant;
  label?: string;
  dot?: boolean;
}

const STYLES: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success:  { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  error:    { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  pending:  { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  active:   { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  inactive: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
  warning:  { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  failing:  { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
};

const DEFAULT_LABELS: Record<BadgeVariant, string> = {
  success:  "Success",
  error:    "Failed",
  pending:  "Pending",
  active:   "Active",
  inactive: "Inactive",
  warning:  "Warning",
  failing:  "Failing",
};

export function StatusBadge({ variant, label, dot = true }: Props) {
  const s = STYLES[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      )}
      {label ?? DEFAULT_LABELS[variant]}
    </span>
  );
}
