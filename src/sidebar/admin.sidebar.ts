/**
 * Admin Sidebar Configuration
 * Maps 1:1 with admin.routes.tsx
 * URL prefix: /admin/*
 */
import {
  LayoutDashboard,
  BookOpen,
  Files,
  Tags,
  Users,
  MessageSquare,
  Image,
  DollarSign,
  Link2,
  Briefcase,
  Layers,
  Gauge,
  ClipboardCheck,
  Trash2,
  Flag,
  MessageSquarePlus,
  Activity,
  UserCog,
  Dumbbell,
  Ticket,
  Network,
  Megaphone,
  Key,
  Webhook,
  ScrollText,
} from "lucide-react";
import type { SidebarConfig, SidebarSection } from "./types";

// Section 1: Overview - maps to /admin/dashboard
const overviewSection: SidebarSection = {
  title: "Overview",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  ],
};

// Section 2: Workflows - maps to /admin/approvals, /admin/delete-requests, /admin/reports
const workflowSection: SidebarSection = {
  title: "Workflows",
  items: [
    { icon: ClipboardCheck, label: "Approval Queue", path: "/admin/approvals" },
    { icon: Trash2, label: "Delete Requests", path: "/admin/delete-requests" },
    { icon: Flag, label: "Reports", path: "/admin/reports" },
  ],
};

// Section 3: Content Management
const contentSection: SidebarSection = {
  title: "Content Management",
  items: [
    { icon: BookOpen, label: "Posts", path: "/admin/posts" },
    { icon: Layers, label: "Courses", path: "/admin/courses" },
    { icon: Gauge, label: "Difficulty Levels", path: "/admin/difficulty-levels" },
    { icon: Dumbbell, label: "Practice Lab", path: "/admin/practice/skills" },
    { icon: Briefcase, label: "Careers", path: "/admin/careers" },
    { icon: Tags, label: "Tags", path: "/admin/tags" },
    { icon: Files, label: "Pages", path: "/admin/pages" },
    { icon: Image, label: "Media Library", path: "/admin/media" },
    { icon: MessageSquare, label: "Comments", path: "/admin/comments" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/admin/annotations" },
  ],
};


// Section 4b: Developers (API Keys, Webhooks, Logs)
const developersSection: SidebarSection = {
  title: "Developers",
  items: [
    { icon: Key,        label: "API Keys",  path: "/admin/developers/api-keys" },
    { icon: Webhook,    label: "Webhooks",  path: "/admin/developers/webhooks" },
    { icon: ScrollText, label: "Logs",      path: "/admin/developers/logs" },
  ],
};

// Section 5: Logs
const logsSection: SidebarSection = {
  title: "Logs",
  items: [
    { icon: Activity, label: "Activity Log", path: "/admin/activity-log" },
    { icon: UserCog, label: "Assignment Logs", path: "/admin/assignments" },
  ],
};

// Section 6: System & Business
const systemSection: SidebarSection = {
  title: "System & Business",
  items: [
    { icon: Users, label: "Users & Roles", path: "/admin/users" },
    { icon: Network, label: "Team Ownership", path: "/admin/team-ownership" },
    { icon: DollarSign, label: "Monetization", path: "/admin/monetization" },
    { icon: Ticket, label: "Promo Codes", path: "/admin/promo-codes" },
    { icon: Megaphone, label: "Announcement Bars", path: "/admin/announcement-bars" },
    { icon: Link2, label: "Redirects", path: "/admin/redirects" },
  ],
};

export const adminSidebarConfig: Omit<SidebarConfig, "roleLabel" | "roleColor"> & Partial<Pick<SidebarConfig, "roleLabel" | "roleColor">> = {
  sections: [
    overviewSection,
    workflowSection,
    contentSection,
    developersSection,
    logsSection,
    systemSection,
  ],
};

export default adminSidebarConfig;
