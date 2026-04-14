import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import {
  SettingsSidebar,
  SettingsSection,
  GeneralSettings,
  EmailSettings,
  NotificationsSettings,
  SEOSettings,
  SecuritySettings,
  IntegrationsSettings,
  AdvancedSettings,
} from "@/components/settings";

const AdminSettings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin, isSeniorModerator, userId, isLoading: roleLoading } = useUserRole();

  // Active section
  const requestedSection = searchParams.get("section");
  const initialSection =
    requestedSection === "branding"
      ? "general"
      : ((requestedSection as SettingsSection) || "general");
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Settings data
  const [siteName, setSiteName] = useState("UnlockMemory");
  const [siteDescription, setSiteDescription] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [codeTheme, setCodeTheme] = useState("tomorrow");

  // Notification preferences
  const { preferences: notificationPrefs, loading: notifPrefsLoading } = useNotificationPreferences(userId);
  const [allNotificationsEnabled, setAllNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!roleLoading) {
      checkAccess();
    }
  }, [roleLoading]);

  useEffect(() => {
    if (notificationPrefs) {
      const allEnabled =
        notificationPrefs.content_submissions &&
        notificationPrefs.reports &&
        notificationPrefs.new_users &&
        notificationPrefs.delete_requests;
      setAllNotificationsEnabled(allEnabled);
    }
  }, [notificationPrefs]);

  useEffect(() => {
    if (requestedSection === "branding") {
      setActiveSection("general");
      setSearchParams({ section: "general" });
    }
  }, [requestedSection, setSearchParams]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    if (!isAdmin && !isSeniorModerator) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    await loadSettings();
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error loading settings:", error);
      return;
    }

    if (data) {
      setSettingsId(data.id);
      setSiteName(data.site_name || "UnlockMemory");
      setSiteDescription(data.site_description || "");
      setSiteUrl(data.site_url || "");
      setMetaTitle(data.meta_title || "");
      setMetaDescription(data.meta_description || "");
      setOgImage(data.og_image || "");
      setOgTitle(data.og_title || "");
      setOgDescription(data.og_description || "");
      setCodeTheme(data.code_theme || "tomorrow");
    }
  };

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    setSearchParams({ section });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        site_name: siteName,
        site_description: siteDescription,
        site_url: siteUrl,
        meta_title: metaTitle,
        meta_description: metaDescription,
        og_image: ogImage,
        og_title: ogTitle,
        og_description: ogDescription,
        code_theme: codeTheme,
      };

      if (settingsId) {
        const { error } = await supabase.from("site_settings").update(updates).eq("id", settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("site_settings").insert(updates).select().single();
        if (error) throw error;
        if (data) setSettingsId(data.id);
      }

      setHasChanges(false);
      toast({ title: "Settings saved successfully" });
    } catch (error: any) {
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAllNotifications = async (enabled: boolean) => {
    if (!userId) return;
    setAllNotificationsEnabled(enabled);

    try {
      const updates = {
        content_submissions: enabled,
        reports: enabled,
        new_users: enabled,
        delete_requests: enabled,
      };

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase.from("notification_preferences").update(updates).eq("user_id", userId);
      } else {
        await supabase.from("notification_preferences").insert({ user_id: userId, ...updates });
      }

      toast({ title: enabled ? "Notifications enabled" : "Notifications disabled" });
    } catch (error) {
      setAllNotificationsEnabled(!enabled);
      toast({ title: "Error updating notifications", variant: "destructive" });
    }
  };

  const handleToggleSingleNotification = async (key: string, enabled: boolean) => {
    if (!userId) return;
    try {
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase.from("notification_preferences").update({ [key]: enabled }).eq("user_id", userId);
      } else {
        await supabase.from("notification_preferences").insert({ user_id: userId, [key]: enabled });
      }
    } catch (error) {
      toast({ title: "Error updating preference", variant: "destructive" });
    }
  };

  // Determine read-only for senior moderators
  const isReadOnly = !isAdmin;

  if (loading || roleLoading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F2A1D]" />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <GeneralSettings
            siteName={siteName}
            setSiteName={(v) => { setSiteName(v); setHasChanges(true); }}
            siteDescription={siteDescription}
            setSiteDescription={(v) => { setSiteDescription(v); setHasChanges(true); }}
            siteUrl={siteUrl}
            setSiteUrl={(v) => { setSiteUrl(v); setHasChanges(true); }}
            codeTheme={codeTheme}
            setCodeTheme={(v) => { setCodeTheme(v); setHasChanges(true); }}
            readOnly={isReadOnly}
          />
        );
      case "email":
        return (
          <EmailSettings
            adminEmail={adminEmail}
            setAdminEmail={(v) => { setAdminEmail(v); setHasChanges(true); }}
            emailNotifications={emailNotifications}
            setEmailNotifications={setEmailNotifications}
          />
        );
      case "notifications":
        return (
          <NotificationsSettings
            preferences={notificationPrefs}
            allNotificationsEnabled={allNotificationsEnabled}
            onToggleAll={handleToggleAllNotifications}
            onToggleSingle={handleToggleSingleNotification}
            loading={notifPrefsLoading}
            isAdmin={isAdmin}
          />
        );
      case "seo":
        return (
          <SEOSettings
            metaTitle={metaTitle}
            setMetaTitle={(v) => { setMetaTitle(v); setHasChanges(true); }}
            metaDescription={metaDescription}
            setMetaDescription={(v) => { setMetaDescription(v); setHasChanges(true); }}
            ogImage={ogImage}
            setOgImage={(v) => { setOgImage(v); setHasChanges(true); }}
            ogTitle={ogTitle}
            setOgTitle={(v) => { setOgTitle(v); setHasChanges(true); }}
            ogDescription={ogDescription}
            setOgDescription={(v) => { setOgDescription(v); setHasChanges(true); }}
            readOnly={isReadOnly}
          />
        );
      case "security":
        return (
          <SecuritySettings
            requireEmailVerification={requireEmailVerification}
            setRequireEmailVerification={setRequireEmailVerification}
            allowPublicRegistration={allowPublicRegistration}
            setAllowPublicRegistration={setAllowPublicRegistration}
          />
        );
      case "integrations":
        return <IntegrationsSettings />;
      case "advanced":
        return <AdvancedSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="space-y-6">
      <div
        className="flex h-[calc(100vh-10rem)] rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--admin-card)",
          border: "1px solid var(--admin-card-border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
      {/* Settings Sidebar */}
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isAdmin={isAdmin}
      />

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Save */}
        <div
          className="flex items-center justify-between px-8 py-4"
          style={{
            backgroundColor: "var(--admin-header-bg)",
            borderBottom: "1px solid var(--admin-border)",
          }}
        >
          <div />
          {hasChanges && isAdmin && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0F6E56] hover:bg-[#0a5a45] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="w-full">
            {renderContent()}
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
  );
};

export default AdminSettings;
