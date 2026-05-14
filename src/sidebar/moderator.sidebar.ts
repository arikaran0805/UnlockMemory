/**
 * Moderator Sidebar Configuration
 * Maps 1:1 with moderator.routes.tsx
 * URL prefix: /moderator/*
 * 
 * Power-Level Color: Action Blue #2563EB
 */
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  ClipboardList,
  Activity,
  Award,
  MessageCircle,
  GraduationCap,
  Tags,
  Image,
  MessageSquarePlus,
  Gavel,
} from "lucide-react";
import type { SidebarConfig, SidebarSection } from "./types";

// Section 1: Overview
const overviewSection: SidebarSection = {
  title: "Overview",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/moderator/dashboard" },
  ],
};

// Section 2: Content
const contentSection: SidebarSection = {
  title: "Content",
  items: [
    { icon: BookOpen, label: "My Content", path: "/moderator/content" },
    { icon: GraduationCap, label: "Courses", path: "/moderator/courses" },
    { icon: Tags, label: "Tags", path: "/moderator/tags" },
  ],
};

// Section 3: Review
const reviewSection: SidebarSection = {
  title: "Review",
  items: [
    { icon: ClipboardList, label: "Review Queue", path: "/moderator/review" },
    { icon: Gavel, label: "Reports", path: "/moderator/reports" },
    { icon: Award, label: "Certificates", path: "/moderator/certificates" },
    { icon: MessageSquare, label: "Comments", path: "/moderator/comments" },
  ],
};

// Section 4: Moderation
const moderationSection: SidebarSection = {
  title: "Moderation",
  items: [
    { icon: Image, label: "Media Library", path: "/moderator/media" },
    { icon: MessageSquarePlus, label: "Annotations", path: "/moderator/annotations" },
  ],
};

// Section 5: Messaging
const messagingSection: SidebarSection = {
  title: "Messaging",
  items: [
    { icon: MessageCircle, label: "Message Requests", path: "/moderator/message-requests" },
  ],
};

// Section 6: Activity
const activitySection: SidebarSection = {
  title: "Activity",
  items: [
    { icon: Activity, label: "My Activity", path: "/moderator/activity" },
  ],
};

export const moderatorSidebarConfig: SidebarConfig = {
  sections: [
    overviewSection,
    contentSection,
    reviewSection,
    moderationSection,
    messagingSection,
    activitySection,
  ],
  roleLabel: "Content Moderator",
  roleColor: {
    // Action Blue #2563EB
    badge: "text-[#2563EB]",
    badgeBg: "bg-[#2563EB]/10",
    badgeBorder: "border-[#2563EB]/20",
    iconActive: "text-white",
    iconDefault: "text-muted-foreground",
    avatarRing: "ring-[#2563EB]/30",
    avatarBg: "bg-[#2563EB]",
    avatarText: "text-white",
    activeBackground: "bg-[#2563EB]",
  },
};

export default moderatorSidebarConfig;
