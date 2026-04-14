import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Clock, Smartphone, AlertTriangle, Lock } from "lucide-react";
import { SettingsCard, SettingsCardHeader, SettingsLabel, SettingsHint, SettingsTitle } from "../SettingsCard";

interface SecuritySettingsProps {
  requireEmailVerification: boolean;
  setRequireEmailVerification: (value: boolean) => void;
  allowPublicRegistration: boolean;
  setAllowPublicRegistration: (value: boolean) => void;
}

const RowItem = ({ label, hint, defaultChecked = false }: { label: string; hint: string; defaultChecked?: boolean }) => (
  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "var(--admin-card-header)" }}>
    <div>
      <p className="text-sm font-medium" style={{ color: "var(--admin-label)" }}>{label}</p>
      <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>{hint}</p>
    </div>
    <Switch defaultChecked={defaultChecked} className="data-[state=checked]:bg-[#0F6E56]" />
  </div>
);

const TwoFARow = ({ label, hint }: { label: string; hint: string }) => (
  <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: "1px solid var(--admin-card-border)" }}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(15,110,86,0.08)" }}>
        <Lock className="h-5 w-5" style={{ color: "#0F6E56" }} />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--admin-label)" }}>{label}</p>
        <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>{hint}</p>
      </div>
    </div>
    <Switch defaultChecked={false} className="data-[state=checked]:bg-[#0F6E56]" />
  </div>
);

const SecuritySettings = ({}: SecuritySettingsProps) => {
  return (
    <div className="space-y-6">
      <SettingsTitle title="Security" description="Protect your platform and users" />

      {/* Password Policy */}
      <SettingsCard>
        <SettingsCardHeader icon={Key} title="Password Policy" description="Configure password requirements" />
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <SettingsLabel>Minimum Password Length</SettingsLabel>
            <Select defaultValue="8">
              <SelectTrigger className="w-32 admin-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["6","8","10","12"].map(v => <SelectItem key={v} value={v}>{v} characters</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <SettingsLabel>Password Requirements</SettingsLabel>
            <div className="space-y-2">
              {[
                { label: "Require uppercase letter", defaultChecked: true },
                { label: "Require lowercase letter", defaultChecked: true },
                { label: "Require number", defaultChecked: true },
                { label: "Require special character", defaultChecked: false },
              ].map((req) => (
                <div key={req.label} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--admin-card-header)" }}>
                  <span className="text-sm" style={{ color: "var(--admin-label)" }}>{req.label}</span>
                  <Switch defaultChecked={req.defaultChecked} className="data-[state=checked]:bg-[#0F6E56]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Session Management */}
      <SettingsCard>
        <SettingsCardHeader icon={Clock} title="Session Management" description="Control session timeout and security" />
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <SettingsLabel>Session Timeout</SettingsLabel>
            <Select defaultValue="24">
              <SelectTrigger className="w-48 admin-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="8">8 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="168">7 days</SelectItem>
                <SelectItem value="720">30 days</SelectItem>
              </SelectContent>
            </Select>
            <SettingsHint>Users will be logged out after this period of inactivity</SettingsHint>
          </div>
          <RowItem label="Require re-authentication for sensitive actions" hint="Prompt for password when changing critical settings" defaultChecked={true} />
        </div>
      </SettingsCard>

      {/* 2FA */}
      <SettingsCard>
        <SettingsCardHeader icon={Smartphone} title="Two-Factor Authentication" description="Add an extra layer of security" />
        <div className="p-6 space-y-4">
          <TwoFARow label="Require 2FA for Admins" hint="All admin accounts must enable 2FA" />
          <TwoFARow label="Require 2FA for Moderators" hint="All moderator accounts must enable 2FA" />
        </div>
      </SettingsCard>

      {/* Login Alerts */}
      <SettingsCard>
        <SettingsCardHeader icon={AlertTriangle} title="Login Alerts" description="Get notified about suspicious login activity" />
        <div className="p-6 space-y-4">
          <RowItem label="New Device Login" hint="Alert when logging in from a new device" defaultChecked={true} />
          <RowItem label="New Location Login" hint="Alert when logging in from a new location" defaultChecked={true} />
          <RowItem label="Failed Login Attempts" hint="Alert after multiple failed login attempts" defaultChecked={true} />
        </div>
      </SettingsCard>
    </div>
  );
};

export default SecuritySettings;
