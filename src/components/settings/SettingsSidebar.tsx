import { cn } from "@/lib/utils";
import {
  Settings,
  Mail,
  Bell,
  Search,
  Shield,
  Plug,
  Cog,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type SettingsSection =
  | "general"
  | "email"
  | "notifications"
  | "seo"
  | "security"
  | "integrations"
  | "advanced";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  isAdmin: boolean;
}

const settingsItems: {
  id: SettingsSection;
  label: string;
  icon: typeof Settings;
  adminOnly?: boolean;
  seniorModeratorAllowed?: boolean;
  isAdvanced?: boolean;
  tooltip?: string;
}[] = [
  { id: "general", label: "General", icon: Settings, seniorModeratorAllowed: true },
  { id: "email", label: "Email", icon: Mail, adminOnly: true },
  { id: "notifications", label: "Notifications", icon: Bell, seniorModeratorAllowed: true },
  { id: "seo", label: "SEO", icon: Search, seniorModeratorAllowed: true },
  { id: "security", label: "Security", icon: Shield, adminOnly: true },
  { id: "integrations", label: "Integrations", icon: Plug, adminOnly: true },
  {
    id: "advanced",
    label: "Advanced",
    icon: Cog,
    adminOnly: true,
    isAdvanced: true,
    tooltip: "Advanced system-level settings",
  },
];

const SettingsSidebar = ({
  activeSection,
  onSectionChange,
  isAdmin,
}: SettingsSidebarProps) => {
  const filteredItems = settingsItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (!isAdmin && !item.seniorModeratorAllowed) return false;
    return true;
  });

  const mainItems = filteredItems.filter((item) => !item.isAdvanced);
  const advancedItems = filteredItems.filter((item) => item.isAdvanced);

  const renderItem = (item: (typeof settingsItems)[0]) => {
    const isActive = activeSection === item.id;
    const Icon = item.icon;

    const button = (
      <button
        onClick={() => onSectionChange(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 relative",
          !isActive && "admin-nav-hover",
        )}
        style={
          isActive
            ? { backgroundColor: "#0F6E56", color: "#ffffff" }
            : { color: item.isAdvanced ? "var(--admin-muted)" : "var(--admin-text)" }
        }
      >
        <Icon
          className="h-[17px] w-[17px] shrink-0"
          style={{ color: isActive ? "#ffffff" : "var(--admin-muted)" }}
        />
        <span>{item.label}</span>
      </button>
    );

    if (item.tooltip) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent
            side="right"
            style={{ backgroundColor: "var(--admin-tooltip-bg)" }}
            className="text-white"
          >
            {item.tooltip}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{button}</div>;
  };

  return (
    <aside
      className="w-56 shrink-0 h-full flex flex-col"
      style={{
        backgroundColor: "var(--admin-bg)",
        borderRight: "1px solid var(--admin-border)",
      }}
    >
      {/* Header */}
      <div
        className="p-5"
        style={{ borderBottom: "1px solid var(--admin-border)" }}
      >
        <h2
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: "var(--admin-text)" }}
        >
          <Settings className="h-4 w-4" style={{ color: "var(--admin-muted)" }} />
          Settings
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--admin-muted)" }}>
          {isAdmin ? "Full access" : "Limited access"}
        </p>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {mainItems.map(renderItem)}
      </nav>

      {/* Advanced section */}
      {advancedItems.length > 0 && (
        <div
          className="p-2"
          style={{ borderTop: "1px solid var(--admin-border)" }}
        >
          {advancedItems.map(renderItem)}
        </div>
      )}
    </aside>
  );
};

export default SettingsSidebar;
