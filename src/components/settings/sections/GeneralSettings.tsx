import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Globe, Moon, Save } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useAutoSavePreference } from "@/hooks/useAutoSavePreference";
import { CODE_THEMES } from "@/hooks/useCodeTheme";

interface GeneralSettingsProps {
  siteName: string;
  setSiteName: (value: string) => void;
  siteDescription: string;
  setSiteDescription: (value: string) => void;
  siteUrl: string;
  setSiteUrl: (value: string) => void;
  codeTheme: string;
  setCodeTheme: (value: string) => void;
  readOnly?: boolean;
}

const AdminCard = ({ children }: { children: React.ReactNode }) => (
  <div
    className="rounded-2xl overflow-hidden shadow-sm"
    style={{
      backgroundColor: "var(--admin-card)",
      border: "1px solid var(--admin-card-border)",
    }}
  >
    {children}
  </div>
);

const AdminCardHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div
    className="px-6 py-4"
    style={{
      backgroundColor: "var(--admin-card-header)",
      borderBottom: "1px solid var(--admin-card-border)",
    }}
  >
    <div
      className="flex items-center gap-2 text-base font-semibold"
      style={{ color: "var(--admin-text)" }}
    >
      <Icon className="h-5 w-5" style={{ color: "var(--admin-muted)" }} />
      {title}
    </div>
    <p className="text-sm mt-0.5" style={{ color: "var(--admin-muted)" }}>
      {description}
    </p>
  </div>
);

const AdminLabel = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label
    htmlFor={htmlFor}
    className="text-sm font-medium"
    style={{ color: "var(--admin-label)" }}
  >
    {children}
  </label>
);

const AdminHint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>
    {children}
  </p>
);

const GeneralSettings = ({
  siteName,
  setSiteName,
  siteDescription,
  setSiteDescription,
  siteUrl,
  setSiteUrl,
  codeTheme,
  setCodeTheme,
  readOnly = false,
}: GeneralSettingsProps) => {
  const { isDark, toggle } = useDarkMode();
  const { autoSaveEnabled, setAutoSaveEnabled } = useAutoSavePreference();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: "var(--admin-text)" }}>
          General Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--admin-muted)" }}>
          Configure your site's basic information
        </p>
      </div>

      {/* Site Information */}
      <AdminCard>
        <AdminCardHeader icon={Globe} title="Site Information" description="Basic details about your platform" />
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <AdminLabel htmlFor="siteName">Site Name</AdminLabel>
            <Input
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="UnlockMemory"
              disabled={readOnly}
              className="admin-input"
            />
          </div>

          <div className="space-y-2">
            <AdminLabel htmlFor="siteDescription">Site Description</AdminLabel>
            <Textarea
              id="siteDescription"
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="A brief description of your platform..."
              rows={3}
              disabled={readOnly}
              className="admin-input resize-none"
            />
            <AdminHint>This description appears in search results and social shares</AdminHint>
          </div>

          <div className="space-y-2">
            <AdminLabel htmlFor="siteUrl">Site URL</AdminLabel>
            <Input
              id="siteUrl"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://unlockmemory.com"
              disabled={readOnly}
              className="admin-input"
            />
          </div>
        </div>
      </AdminCard>

      {/* Appearance */}
      <AdminCard>
        <AdminCardHeader icon={Moon} title="Appearance" description="Customize the admin interface appearance" />
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label
                htmlFor="dark-mode-toggle"
                className="text-sm font-medium cursor-pointer"
                style={{ color: "var(--admin-label)" }}
              >
                Dark Mode
              </label>
              <AdminHint>Switch between light and dark appearance for the admin experience</AdminHint>
            </div>
            <Switch
              id="dark-mode-toggle"
              checked={isDark}
              onCheckedChange={toggle}
              aria-label="Toggle dark mode"
            />
          </div>
        </div>
      </AdminCard>

      {/* Editor Preferences */}
      <AdminCard>
        <AdminCardHeader icon={Save} title="Editor Preferences" description="Customize your post editor experience" />
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label
                htmlFor="auto-save-toggle"
                className="text-sm font-medium cursor-pointer"
                style={{ color: "var(--admin-label)" }}
              >
                Auto Save
              </label>
              <AdminHint>Automatically save drafts while editing posts</AdminHint>
            </div>
            <Switch
              id="auto-save-toggle"
              checked={autoSaveEnabled}
              onCheckedChange={setAutoSaveEnabled}
              disabled={readOnly}
              aria-label="Toggle auto save"
            />
          </div>

          <div className="space-y-2">
            <AdminLabel>Code Theme</AdminLabel>
            <Select value={codeTheme} onValueChange={setCodeTheme} disabled={readOnly}>
              <SelectTrigger className="admin-input max-w-xs">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                {CODE_THEMES.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AdminHint>This theme will be used for all code blocks across the site</AdminHint>
          </div>
        </div>
      </AdminCard>
    </div>
  );
};

export default GeneralSettings;
