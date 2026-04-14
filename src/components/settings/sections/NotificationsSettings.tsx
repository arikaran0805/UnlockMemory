import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Monitor, Shield, Users, FileText, Flag, Trash2 } from "lucide-react";
import { SettingsCard, SettingsCardHeader, SettingsTitle } from "../SettingsCard";

interface NotificationPrefs {
  content_submissions: boolean;
  reports: boolean;
  new_users: boolean;
  delete_requests: boolean;
  content_approved: boolean;
  content_rejected: boolean;
  changes_requested: boolean;
  annotations: boolean;
  email_notifications: boolean;
}

interface NotificationsSettingsProps {
  preferences: NotificationPrefs | null;
  allNotificationsEnabled: boolean;
  onToggleAll: (enabled: boolean) => void;
  onToggleSingle: (key: string, enabled: boolean) => void;
  loading: boolean;
  isAdmin: boolean;
}

const NotificationsSettings = ({
  preferences, allNotificationsEnabled, onToggleAll, onToggleSingle, loading, isAdmin,
}: NotificationsSettingsProps) => {
  const adminNotifications = [
    { key: "content_submissions", label: "Content Submissions", description: "When moderators submit content for approval", icon: FileText },
    { key: "reports", label: "Reports", description: "User reports on content or comments", icon: Flag },
    { key: "new_users", label: "New Users", description: "When new users register", icon: Users },
    { key: "delete_requests", label: "Delete Requests", description: "When content deletion is requested", icon: Trash2 },
  ];

  const moderatorNotifications = [
    { key: "content_approved", label: "Content Approved", description: "When your content is approved", icon: FileText },
    { key: "content_rejected", label: "Content Rejected", description: "When your content is rejected", icon: FileText },
    { key: "changes_requested", label: "Changes Requested", description: "When changes are requested on your content", icon: FileText },
    { key: "annotations", label: "Annotations", description: "When annotations are added to your content", icon: FileText },
  ];

  const NotifRow = ({ notif }: { notif: { key: string; label: string; description: string; icon: React.ElementType } }) => {
    const Icon = notif.icon;
    const isEnabled = preferences?.[notif.key as keyof NotificationPrefs] ?? true;
    return (
      <div
        className="flex items-center justify-between p-4 admin-nav-hover transition-colors"
        style={{ borderBottom: "1px solid var(--admin-card-border)" }}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4" style={{ color: "var(--admin-muted)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--admin-label)" }}>{notif.label}</p>
            <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>{notif.description}</p>
          </div>
        </div>
        <Switch checked={isEnabled} onCheckedChange={(e) => onToggleSingle(notif.key, e)}
          disabled={loading || !allNotificationsEnabled}
          className="data-[state=checked]:bg-[#0F6E56]" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SettingsTitle title="Notifications" description="Manage how you receive notifications" />

      {/* Master Toggle */}
      <SettingsCard>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(15,110,86,0.10)" }}>
                <Bell className="h-6 w-6" style={{ color: "#0F6E56" }} />
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: "var(--admin-text)" }}>All Notifications</p>
                <p className="text-sm" style={{ color: "var(--admin-muted)" }}>Master toggle for all notification types</p>
              </div>
            </div>
            <Switch checked={allNotificationsEnabled} onCheckedChange={onToggleAll} disabled={loading}
              className="data-[state=checked]:bg-[#0F6E56]" />
          </div>
        </div>
      </SettingsCard>

      {/* Admin Notifications */}
      {isAdmin && (
        <SettingsCard>
          <SettingsCardHeader icon={Shield} title="Admin Notifications" description="Notifications for administrative events" />
          <div className="divide-y" style={{ borderColor: "var(--admin-card-border)" }}>
            {adminNotifications.map((notif) => <NotifRow key={notif.key} notif={notif} />)}
          </div>
        </SettingsCard>
      )}

      {/* Moderator Notifications */}
      <SettingsCard>
        <SettingsCardHeader icon={Monitor} title="Content Notifications" description="Notifications about your content" />
        <div className="divide-y" style={{ borderColor: "var(--admin-card-border)" }}>
          {moderatorNotifications.map((notif) => <NotifRow key={notif.key} notif={notif} />)}
        </div>
      </SettingsCard>

      {/* Email Delivery */}
      <SettingsCard>
        <SettingsCardHeader icon={Mail} title="Delivery Method" />
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4" style={{ color: "var(--admin-muted)" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--admin-label)" }}>Email Notifications</p>
                <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>Also receive notifications via email</p>
              </div>
            </div>
            <Switch checked={preferences?.email_notifications ?? false}
              onCheckedChange={(e) => onToggleSingle("email_notifications", e)} disabled={loading}
              className="data-[state=checked]:bg-[#0F6E56]" />
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};

export default NotificationsSettings;
