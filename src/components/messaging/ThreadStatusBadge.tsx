import { cn } from "@/lib/utils";
import type { ThreadStatus, RoutingType } from "@/hooks/useConversationThreads";

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  open: { label: "Open", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  assigned: { label: "Assigned", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  replied: { label: "Replied", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  resolved: { label: "Resolved", className: "bg-muted text-muted-foreground" },
};

const routingConfig: Record<string, { label: string; className: string }> = {
  direct_moderator: { label: "Direct Moderator", className: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
  team_senior_moderator: { label: "Team Managed", className: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
};

export function ThreadStatusBadge({ status }: { status: ThreadStatus }) {
  const config = statusConfig[status] || statusConfig.new;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
      config.className
    )}>
      {config.label}
    </span>
  );
}

export function RoutingBadge({ type }: { type: RoutingType }) {
  const config = routingConfig[type] || routingConfig.direct_moderator;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
      config.className
    )}>
      {config.label}
    </span>
  );
}
