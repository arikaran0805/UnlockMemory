import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Plug, Webhook, Key, ExternalLink, Check, X, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { SettingsCard, SettingsCardHeader, SettingsLabel, SettingsHint, SettingsTitle } from "../SettingsCard";

const IntegrationsSettings = () => {
  const navigate = useNavigate();
  const [showApiKey, setShowApiKey] = useState(false);

  const connectedServices = [
    { name: "Google Analytics", status: "connected", icon: "📊" },
    { name: "Stripe", status: "not_connected", icon: "💳" },
    { name: "SendGrid", status: "not_connected", icon: "📧" },
    { name: "Cloudflare", status: "connected", icon: "☁️" },
  ];

  return (
    <div className="space-y-6">
      <SettingsTitle title="Integrations" description="Connect external services and manage API access" />

      {/* Connected Services */}
      <SettingsCard>
        <SettingsCardHeader icon={Plug} title="Connected Services" description="Third-party services connected to your platform" />
        <div>
          {connectedServices.map((service, i) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-4 admin-nav-hover transition-colors"
              style={{ borderBottom: i < connectedServices.length - 1 ? "1px solid var(--admin-card-border)" : undefined }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: "var(--admin-card-header)", border: "1px solid var(--admin-card-border)" }}>
                  {service.icon}
                </div>
                <div>
                  <span className="font-medium text-sm" style={{ color: "var(--admin-label)" }}>{service.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {service.status === "connected" ? (
                      <><Check className="h-3 w-3 text-green-500" /><span className="text-xs text-green-500">Connected</span></>
                    ) : (
                      <><X className="h-3 w-3" style={{ color: "var(--admin-muted)" }} /><span className="text-xs" style={{ color: "var(--admin-muted)" }}>Not connected</span></>
                    )}
                  </div>
                </div>
              </div>
              <Button variant={service.status === "connected" ? "outline" : "default"} size="sm"
                className={service.status === "connected" ? "admin-input border text-sm" : "bg-[#0F6E56] hover:bg-[#0a5a45] text-white text-sm"}>
                {service.status === "connected" ? "Configure" : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Webhooks */}
      <SettingsCard>
        <SettingsCardHeader icon={Webhook} title="Webhooks" description="Send real-time notifications to external services" />
        <div className="p-6">
          <div className="text-center py-8 border-2 border-dashed rounded-xl"
            style={{ borderColor: "var(--admin-card-border)", backgroundColor: "var(--admin-card-header)" }}>
            <Webhook className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--admin-muted)" }} />
            <p className="text-sm mb-4" style={{ color: "var(--admin-muted)" }}>No webhooks configured</p>
            <Button variant="outline" className="admin-input border">Add Webhook</Button>
          </div>
        </div>
      </SettingsCard>

      {/* API Keys */}
      <SettingsCard>
        <SettingsCardHeader icon={Key} title="API Keys" description="Manage API access for external applications" />
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <SettingsLabel>Public API Key</SettingsLabel>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input value={showApiKey ? "pk_live_a1b2c3d4e5f6g7h8i9j0" : "pk_live_••••••••••••••••••••"}
                  readOnly className="font-mono text-sm admin-input pr-10" />
                <button onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--admin-muted)" }}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button variant="outline" size="sm" className="admin-input border">Copy</Button>
            </div>
            <SettingsHint>Use this key for client-side API calls</SettingsHint>
          </div>

          <div className="space-y-2">
            <SettingsLabel>Secret API Key</SettingsLabel>
            <div className="flex gap-2">
              <Input value="sk_live_••••••••••••••••••••" readOnly className="font-mono text-sm admin-input" />
              <Button variant="outline" size="sm" className="admin-input border">Reveal</Button>
            </div>
            <p className="text-xs text-amber-500">⚠️ Never expose this key in client-side code</p>
          </div>

          <div className="pt-4">
            <Button variant="outline" onClick={() => navigate("/admin/api")} className="admin-input border">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage All API Keys
            </Button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};

export default IntegrationsSettings;
