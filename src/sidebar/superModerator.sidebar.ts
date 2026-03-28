/**
 * Career Manager Sidebar Configuration
 * Maps 1:1 with superModerator.routes.tsx
 * URL prefix: /super-moderator/*
 * 
 * Career Manager is a CAREER OWNER - manages assigned careers
 * Power-Level Color: Royal Purple #5B3CC4
 */
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Briefcase,
  Tags,
  FileText,
  MessageSquare,
  Image,
  MessageSquarePlus,
  CheckSquare,
  BarChart3,
  Users,
  Gavel,
  Activity,
  UserCog,
} from "lucide-react";
import type { SidebarConfig, SidebarSection } from "./types";

// Section 1: Overview
const overviewSection: SidebarSection = {
  title: "Overview",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/super-moderator/dashboard" },
  ],
};

// Section 2: Approval Queue
const approvalSection: SidebarSection = {
  title: "Approval Queue",
  items: [
    { icon: CheckSquare, label: "Approvals", path: "/super-moderator/approvals" },
    { icon: Gavel, label: "Reports", path: "/super-moderator/reports" },
  ],
};

// Section 3: Career Management - Career Manager's primary scope
const careerSection: SidebarSection = {
  title: "Career Management",
  items: [
    { icon: Briefcase, label: "My Careers", path: "/super-moderator/careers" },
    { icon: GraduationCap, label: "Courses", path: "/super-moderator/courses" },
    { icon: BookOpen, label: "Posts", path: "/super-moderator/posts" },
    { icon: Tags, label: "Tags", path: "/super-moderator/tags" },
    { icon: FileText, label: "Pages", path: "/super-moderator/pages" },
  ],
};

// Section 4: Moderation
const moderationSection: SidebarSection = {
  title: "Moderation",
  items: [
    { icon: Image, label: "Media Library", path: "/super-moderator/media" },
    { icon: MessageSquare, label: "Comments", path: "/super-moderator/comments" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/super-moderator/annotations" },
  ],
};

// Section 5: Team
const teamSection: SidebarSection = {
  title: "Team",
  items: [
    { icon: UserCog, label: "Assignments", path: "/super-moderator/assignments" },
    { icon: Users, label: "Users", path: "/super-moderator/users" },
  ],
};

// Section 6: Analytics
const analyticsSection: SidebarSection = {
  title: "Analytics",
  items: [
    { icon: BarChart3, label: "Content Analytics", path: "/super-moderator/analytics" },
    { icon: Activity, label: "Activity Log", path: "/super-moderator/activity" },
  ],
};

export const superModeratorSidebarConfig: SidebarConfig = {
  sections: [
    overviewSection,
    approvalSection,
    careerSection,
    moderationSection,
    teamSection,
    analyticsSection,
  ],
  roleLabel: "Career Manager",
  roleColor: {
    // Royal Purple #5B3CC4
    badge: "text-[#5B3CC4]",
    badgeBg: "bg-[#5B3CC4]/10",
    badgeBorder: "border-[#5B3CC4]/20",
    iconActive: "text-white",
    iconDefault: "text-muted-foreground",
    avatarRing: "ring-[#5B3CC4]/30",
    avatarBg: "bg-[#5B3CC4]",
    avatarText: "text-white",
    activeBackground: "bg-[#5B3CC4]",
  },
};

export default superModeratorSidebarConfig;
