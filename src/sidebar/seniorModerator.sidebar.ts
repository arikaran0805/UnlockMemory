/**
 * Senior Moderator Sidebar Configuration
 * Maps 1:1 with seniorModerator.routes.tsx
 * URL prefix: /senior-moderator/*
 * 
 * Power-Level Color: Amber #D97706
 */
import {
  LayoutDashboard,
  BookOpen,
  Tags,
  FileText,
  MessageSquare,
  Image,
  GraduationCap,
  MessageSquarePlus,
  MessageCircle,
  CheckSquare,
  BarChart3,
  Users,
  Gavel,
  Activity,
} from "lucide-react";
import type { SidebarConfig, SidebarSection } from "./types";

// Section 1: Overview
const overviewSection: SidebarSection = {
  title: "Overview",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/senior-moderator/dashboard" },
  ],
};

// Section 2: Approval Queue
const approvalSection: SidebarSection = {
  title: "Approval Queue",
  items: [
    { icon: CheckSquare, label: "Approvals", path: "/senior-moderator/approvals" },
    { icon: Gavel, label: "Reports", path: "/senior-moderator/reports" },
  ],
};

// Section 3: Content
const contentSection: SidebarSection = {
  title: "Content",
  items: [
    { icon: BookOpen, label: "Posts", path: "/senior-moderator/posts" },
    { icon: GraduationCap, label: "Courses", path: "/senior-moderator/courses" },
    { icon: Tags, label: "Tags", path: "/senior-moderator/tags" },
    { icon: FileText, label: "Pages", path: "/senior-moderator/pages" },
  ],
};

// Section 4: Moderation
const moderationSection: SidebarSection = {
  title: "Moderation",
  items: [
    { icon: Image, label: "Media Library", path: "/senior-moderator/media" },
    { icon: MessageSquare, label: "Comments", path: "/senior-moderator/comments" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/senior-moderator/annotations" },
  ],
};

// Section 5: Analytics
const analyticsSection: SidebarSection = {
  title: "Analytics",
  items: [
    { icon: BarChart3, label: "Content Analytics", path: "/senior-moderator/analytics" },
    { icon: Activity, label: "Activity Log", path: "/senior-moderator/activity" },
  ],
};

// Section 6: Messaging
const messagingSection: SidebarSection = {
  title: "Messaging",
  items: [
    { icon: MessageCircle, label: "Message Requests", path: "/senior-moderator/message-requests" },
  ],
};

// Section 7: Team
const activitySection: SidebarSection = {
  title: "Team",
  items: [
    { icon: Users, label: "Users", path: "/senior-moderator/users" },
  ],
};

export const seniorModeratorSidebarConfig: SidebarConfig = {
  sections: [
    overviewSection,
    approvalSection,
    contentSection,
    moderationSection,
    analyticsSection,
    messagingSection,
    activitySection,
  ],
  roleLabel: "Senior Moderator",
  roleColor: {
    // Amber #D97706
    badge: "text-[#D97706]",
    badgeBg: "bg-[#D97706]/10",
    badgeBorder: "border-[#D97706]/20",
    iconActive: "text-white",
    iconDefault: "text-muted-foreground",
    avatarRing: "ring-[#D97706]/30",
    avatarBg: "bg-[#D97706]",
    avatarText: "text-white",
    activeBackground: "bg-[#D97706]",
  },
};

export default seniorModeratorSidebarConfig;
