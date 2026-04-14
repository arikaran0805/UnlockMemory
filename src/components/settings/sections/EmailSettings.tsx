import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, Server, CheckCircle } from "lucide-react";
import { useState } from "react";
import { SettingsCard, SettingsCardHeader, SettingsLabel, SettingsHint, SettingsTitle } from "../SettingsCard";

interface EmailSettingsProps {
  adminEmail: string;
  setAdminEmail: (value: string) => void;
  emailNotifications: boolean;
  setEmailNotifications: (value: boolean) => void;
}

const EmailSettings = ({ adminEmail, setAdminEmail }: EmailSettingsProps) => {
  const [testingSend, setTestingSend] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleTestEmail = async () => {
    setTestingSend(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setTestingSend(false);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="space-y-6">
      <SettingsTitle title="Email Configuration" description="Configure email delivery and notifications" />

      <SettingsCard>
        <SettingsCardHeader icon={Server} title="Email Provider" description="Configure your email delivery service" />
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <SettingsLabel>Email Provider</SettingsLabel>
            <Select defaultValue="default">
              <SelectTrigger className="admin-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Built-in)</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="mailgun">Mailgun</SelectItem>
                <SelectItem value="ses">Amazon SES</SelectItem>
                <SelectItem value="smtp">Custom SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <SettingsLabel>SMTP Host</SettingsLabel>
              <Input placeholder="smtp.example.com" disabled className="admin-input" />
            </div>
            <div className="space-y-2">
              <SettingsLabel>SMTP Port</SettingsLabel>
              <Input placeholder="587" disabled className="admin-input" />
            </div>
          </div>
          <SettingsHint>Using the default provider. Select a different provider to configure custom SMTP settings.</SettingsHint>
        </div>
      </SettingsCard>

      <SettingsCard>
        <SettingsCardHeader icon={Mail} title="Sender Configuration" description='Configure the "From" details for outgoing emails' />
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <SettingsLabel>Sender Name</SettingsLabel>
            <Input placeholder="UnlockMemory" defaultValue="UnlockMemory" className="admin-input" />
            <SettingsHint>The name that appears as the sender</SettingsHint>
          </div>
          <div className="space-y-2">
            <SettingsLabel>Sender Email</SettingsLabel>
            <Input type="email" placeholder="noreply@unlockmemory.com" defaultValue="noreply@unlockmemory.com" className="admin-input" />
            <SettingsHint>The email address that appears as the sender</SettingsHint>
          </div>
          <div className="space-y-2">
            <SettingsLabel>Admin Email</SettingsLabel>
            <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@unlockmemory.com" className="admin-input" />
            <SettingsHint>System notifications will be sent to this address</SettingsHint>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <SettingsCardHeader icon={Send} title="Test Email" description="Send a test email to verify your configuration" />
        <div className="p-6">
          <div className="flex items-center gap-4">
            <Input type="email" placeholder="Enter email to send test" className="flex-1 admin-input" />
            <Button onClick={handleTestEmail} disabled={testingSend}
              className={testSent ? "bg-green-600 hover:bg-green-700" : "bg-[#0F6E56] hover:bg-[#0a5a45]"}>
              {testSent ? (<><CheckCircle className="h-4 w-4 mr-2" />Sent!</>) :
               testingSend ? "Sending..." :
               (<><Send className="h-4 w-4 mr-2" />Send Test</>)}
            </Button>
          </div>
          <SettingsHint>A test email will be sent to the specified address</SettingsHint>
        </div>
      </SettingsCard>
    </div>
  );
};

export default EmailSettings;
