import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, FileEdit, Send, Archive } from "lucide-react";

export type ContentStatus = "draft" | "pending" | "approved" | "rejected" | "published" | "changes_requested" | "archived";

interface ContentStatusBadgeProps {
  status: ContentStatus;
  className?: string;
}

const statusConfig: Record<ContentStatus, { 
  label: string; 
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
  className: string;
}> = {
  draft: {
    label: "Draft",
    variant: "outline",
    icon: <FileEdit className="h-3 w-3" />,
    className: "border-muted-foreground/50 text-muted-foreground",
  },
  pending: {
    label: "Pending Approval",
    variant: "secondary",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    variant: "default",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  published: {
    label: "Published",
    variant: "default",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  changes_requested: {
    label: "Changes Requested",
    variant: "secondary",
    icon: <Send className="h-3 w-3" />,
    className: "bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400",
  },
  archived: {
    label: "Archived",
    variant: "outline",
    icon: <Archive className="h-3 w-3" />,
    className: "border-muted-foreground/40 text-muted-foreground",
  },
};

export const ContentStatusBadge = ({ status, className = "" }: ContentStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} flex items-center gap-1.5 font-medium ${className}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};
