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
  Key,
  Briefcase,
  BarChart3,
  Share2,
  Layers,
  ClipboardCheck,
  Trash2,
  Flag,
  MessageSquarePlus,
  Activity,
  Shield,
  UserCog,
  Users2,
  Dumbbell,
  Ticket,
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
    { icon: Dumbbell, label: "Practice Lab", path: "/admin/practice/skills" },
    { icon: Briefcase, label: "Careers", path: "/admin/careers" },
    { icon: Tags, label: "Tags", path: "/admin/tags" },
    { icon: Files, label: "Pages", path: "/admin/pages" },
    { icon: Image, label: "Media Library", path: "/admin/media" },
    { icon: MessageSquare, label: "Comments", path: "/admin/comments" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/admin/annotations" },
  ],
};

// Section 4: Analytics
const analyticsSection: SidebarSection = {
  title: "Analytics",
  items: [
    { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
    { icon: Share2, label: "Social Analytics", path: "/admin/social-analytics" },
    { icon: Activity, label: "Activity Log", path: "/admin/activity-log" },
  ],
};

// Section 5: System & Business
const systemSection: SidebarSection = {
  title: "System & Business",
  items: [
    { icon: Users, label: "Users", path: "/admin/users" },
    { icon: Shield, label: "Roles & Permissions", path: "/admin/authors" },
    { icon: Users2, label: "Team Ownership", path: "/admin/team-ownership" },
    { icon: UserCog, label: "Assignment Logs", path: "/admin/assignments" },
    { icon: DollarSign, label: "Monetization", path: "/admin/monetization" },
    { icon: Ticket, label: "Promo Codes", path: "/admin/promo-codes" },
    { icon: Link2, label: "Redirects", path: "/admin/redirects" },
    { icon: Key, label: "API & Integrations", path: "/admin/api" },
  ],
};

export const adminSidebarConfig: Omit<SidebarConfig, "roleLabel" | "roleColor"> & Partial<Pick<SidebarConfig, "roleLabel" | "roleColor">> = {
  sections: [
    overviewSection,
    workflowSection,
    contentSection,
    analyticsSection,
    systemSection,
  ],
};

export default adminSidebarConfig;
