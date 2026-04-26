/**
 * IntegrationsSettings — production-grade integrations dashboard.
 *
 * Architecture:
 *   - Integration credentials stored in site_settings.integrations (JSONB)
 *   - Status derived from DB: "connected" iff all required fields are non-empty
 *   - ConfigModal handles connect / configure / disconnect for each integration
 *   - Email integrations (Resend, SendGrid) redirect to Email Settings
 *
 * DB shape for site_settings.integrations:
 *   {
 *     "stripe": { connected_at: "ISO", publishable_key: "pk_live_...", secret_key: "sk_..." },
 *     "google-analytics": { connected_at: "ISO", measurement_id: "G-XXXXXXXX" },
 *     ...
 *   }
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, ArrowRight, Loader2, Sparkles, Clock,
  Eye, EyeOff, AlertTriangle, ExternalLink, Link2Off,
} from "lucide-react";
import { SettingsTitle } from "../SettingsCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = "connected" | "not_connected" | "coming_soon";

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  hint?: string;
  helpUrl?: string;
  secret?: boolean;
  required: boolean;
}

/** Static definition — no status, that is always derived from DB */
interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
  emailRedirect?: boolean;
  comingSoon?: boolean;
  fields?: FieldDef[];
}

interface CategoryDef {
  id: string;
  label: string;
  description: string;
  integrations: IntegrationDef[];
}

/** What we persist per integration in site_settings.integrations JSONB */
interface StoredConfig {
  connected_at: string;
  [field: string]: string;
}

type IntegrationsState = Record<string, StoredConfig>;

// ─── Brand tiles ──────────────────────────────────────────────────────────────

const BRAND: Record<string, { bg: string; text: string; abbr: string }> = {
  "google-analytics": { bg: "#E37400", text: "#fff", abbr: "GA"   },
  "google-ads":       { bg: "#4285F4", text: "#fff", abbr: "Ads"  },
  "meta-ads":         { bg: "#0082FB", text: "#fff", abbr: "Meta" },
  "stripe":           { bg: "#635BFF", text: "#fff", abbr: "S"    },
  "razorpay":         { bg: "#2D81EE", text: "#fff", abbr: "Rz"   },
  "resend":           { bg: "#1A1A1A", text: "#fff", abbr: "Re"   },
  "sendgrid":         { bg: "#1A82E2", text: "#fff", abbr: "SG"   },
  "cloudflare":       { bg: "#F38020", text: "#fff", abbr: "CF"   },
};

// ─── Integration registry (pure metadata — no hardcoded status) ───────────────

const CATEGORIES: CategoryDef[] = [
  {
    id: "analytics",
    label: "Analytics & Advertising",
    description: "Track performance, measure conversions, and run campaigns",
    integrations: [
      {
        id: "google-analytics",
        name: "Google Analytics",
        description: "Track page views, sessions, and user behavior across your platform",
        fields: [
          {
            key: "measurement_id",
            label: "Measurement ID",
            placeholder: "G-XXXXXXXXXX",
            hint: "Found in Google Analytics → Admin → Data Streams → your stream → Measurement ID",
            helpUrl: "https://support.google.com/analytics/answer/9539598",
            required: true,
          },
        ],
      },
      {
        id: "google-ads",
        name: "Google Ads",
        description: "Measure ad conversions and sync audiences from your learner base",
        fields: [
          {
            key: "conversion_id",
            label: "Conversion ID",
            placeholder: "AW-XXXXXXXXXX",
            hint: "Found in Google Ads → Tools & Settings → Tag setup → Google tag",
            required: true,
          },
          {
            key: "conversion_label",
            label: "Conversion Label",
            placeholder: "xxxxxxxxxxxxxxxxxx",
            hint: "Optional — required only for specific conversion actions",
            required: false,
          },
        ],
      },
      {
        id: "meta-ads",
        name: "Meta Ads",
        description: "Run retargeting campaigns and track Facebook & Instagram ad ROI",
        fields: [
          {
            key: "pixel_id",
            label: "Pixel ID",
            placeholder: "123456789012345",
            hint: "Found in Meta Business Suite → Events Manager → Data Sources → your pixel",
            helpUrl: "https://www.facebook.com/business/help/952192354843755",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    description: "Collect revenue, manage subscriptions, and process refunds",
    integrations: [
      {
        id: "stripe",
        name: "Stripe",
        description: "Accept cards, manage subscriptions, and automate billing worldwide",
        recommended: true,
        fields: [
          {
            key: "publishable_key",
            label: "Publishable Key",
            placeholder: "pk_live_...",
            hint: "Safe to expose — used in client-side code",
            required: true,
          },
          {
            key: "secret_key",
            label: "Secret Key",
            placeholder: "sk_live_...",
            hint: "Keep this private — never expose in client-side code",
            secret: true,
            required: true,
          },
          {
            key: "webhook_secret",
            label: "Webhook Signing Secret",
            placeholder: "whsec_...",
            hint: "Optional — from Stripe Dashboard → Developers → Webhooks → your endpoint",
            secret: true,
            required: false,
          },
        ],
      },
      {
        id: "razorpay",
        name: "Razorpay",
        description: "Accept payments in India via UPI, cards, and net banking",
        fields: [
          {
            key: "key_id",
            label: "Key ID",
            placeholder: "rzp_live_...",
            hint: "Found in Razorpay Dashboard → Settings → API Keys",
            required: true,
          },
          {
            key: "key_secret",
            label: "Key Secret",
            placeholder: "Your Razorpay key secret",
            secret: true,
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "email",
    label: "Email Delivery",
    description: "Transactional email and marketing delivery infrastructure",
    integrations: [
      {
        id: "resend",
        name: "Resend",
        description: "Developer-first email API built for reliability and deliverability",
        recommended: true,
        emailRedirect: true,
      },
      {
        id: "sendgrid",
        name: "SendGrid",
        description: "High-volume transactional and marketing email at scale",
        emailRedirect: true,
      },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure & CDN",
    description: "Performance, security, and global distribution",
    integrations: [
      {
        id: "cloudflare",
        name: "Cloudflare",
        description: "CDN, DDoS protection, and edge caching for faster load times",
        fields: [
          {
            key: "zone_id",
            label: "Zone ID",
            placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            hint: "Found on the domain overview page in your Cloudflare dashboard",
            required: true,
          },
          {
            key: "api_token",
            label: "API Token",
            placeholder: "Your Cloudflare API token",
            hint: "Create a token with Zone:Read and Cache Purge permissions",
            secret: true,
            required: true,
          },
        ],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d  = Math.floor(ms / 86400000);
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor(ms / 60000);
  if (d > 0) return `${d} day${d > 1 ? "s" : ""} ago`;
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ago`;
  if (m > 0) return `${m} minute${m > 1 ? "s" : ""} ago`;
  return "Just now";
}

function isConnected(id: string, data: IntegrationsState, fields?: FieldDef[]): boolean {
  const cfg = data[id];
  if (!cfg || !cfg.connected_at) return false;
  // Must have all required fields non-empty
  const required = (fields ?? []).filter((f) => f.required);
  return required.every((f) => typeof cfg[f.key] === "string" && cfg[f.key].trim().length > 0);
}

function deriveStatus(
  def: IntegrationDef,
  data: IntegrationsState,
): IntegrationStatus {
  if (def.comingSoon) return "coming_soon";
  if (def.emailRedirect) return "not_connected"; // always redirects — managed elsewhere
  if (isConnected(def.id, data, def.fields)) return "connected";
  return "not_connected";
}

// ─── LogoTile ─────────────────────────────────────────────────────────────────

function LogoTile({ id }: { id: string }) {
  const b = BRAND[id] ?? { bg: "#8A9490", text: "#fff", abbr: id.slice(0, 2).toUpperCase() };
  return (
    <div
      className="h-10 w-10 rounded-[10px] flex items-center justify-center shrink-0 select-none"
      style={{ backgroundColor: b.bg }}
    >
      <span className="text-[11px] font-bold tracking-tight leading-none" style={{ color: b.text }}>
        {b.abbr}
      </span>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  connectedSince,
}: {
  status: IntegrationStatus;
  connectedSince?: string;
}) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-[12px] font-medium text-emerald-600">
          Connected{connectedSince ? ` · ${connectedSince}` : ""}
        </span>
      </div>
    );
  }
  if (status === "coming_soon") {
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="h-3 w-3" style={{ color: "var(--admin-muted)" }} />
        <span className="text-[12px]" style={{ color: "var(--admin-muted)" }}>Coming soon</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
      <span className="text-[12px]" style={{ color: "var(--admin-muted)" }}>Not connected</span>
    </div>
  );
}

// ─── Config Modal ─────────────────────────────────────────────────────────────

interface ConfigModalProps {
  integration: IntegrationDef;
  existingConfig: StoredConfig | null;
  onSave: (id: string, fields: Record<string, string>) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onClose: () => void;
}

function ConfigModal({ integration, existingConfig, onSave, onDisconnect, onClose }: ConfigModalProps) {
  const fields = integration.fields ?? [];
  const isEdit = !!existingConfig;

  // Form state — pre-fill from existingConfig (masked secret fields show placeholder, not real value)
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => {
      init[f.key] = isEdit && !f.secret ? (existingConfig?.[f.key] ?? "") : "";
    });
    return init;
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const set = (key: string, val: string) => setForm((prev) => ({ ...prev, [key]: val }));

  const requiredFields = fields.filter((f) => f.required);
  const canSave = requiredFields.every((f) => {
    // For secret fields in edit mode: allow saving even if left blank (means "keep existing")
    if (f.secret && isEdit && form[f.key].trim() === "") return true;
    return form[f.key].trim().length > 0;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // For secret fields in edit mode left blank → keep existing value
      const payload: Record<string, string> = {};
      fields.forEach((f) => {
        if (f.secret && isEdit && form[f.key].trim() === "") {
          payload[f.key] = existingConfig?.[f.key] ?? "";
        } else {
          payload[f.key] = form[f.key].trim();
        }
      });
      await onSave(integration.id, payload);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect(integration.id);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <LogoTile id={integration.id} />
            <div>
              <DialogTitle className="text-[16px]">
                {isEdit ? `${integration.name} Configuration` : `Connect ${integration.name}`}
              </DialogTitle>
              <DialogDescription className="text-[13px] mt-0.5">
                {isEdit
                  ? "Update your credentials — leave secret fields blank to keep existing values."
                  : integration.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium" style={{ color: "#4A5250" }}>
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-[#DC2626]">*</span>
                  )}
                </label>
                {field.helpUrl && (
                  <a
                    href={field.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: "#0F6E56" }}
                  >
                    Where to find this
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              <div className="relative">
                <Input
                  type={field.secret && !revealed[field.key] ? "password" : "text"}
                  value={form[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder={
                    field.secret && isEdit
                      ? "Leave blank to keep existing value"
                      : field.placeholder
                  }
                  className="font-mono text-[13px] pr-10"
                  autoComplete="off"
                />
                {field.secret && (
                  <button
                    type="button"
                    onClick={() => setRevealed((r) => ({ ...r, [field.key]: !r[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: "#8A9490" }}
                  >
                    {revealed[field.key]
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />
                    }
                  </button>
                )}
              </div>

              {field.hint && (
                <p className="text-[11px] leading-relaxed" style={{ color: "#8A9490" }}>
                  {field.hint}
                </p>
              )}
            </div>
          ))}

          {/* Disconnect zone — only in edit mode */}
          {isEdit && (
            <div
              className="mt-4 p-4 rounded-xl space-y-2.5"
              style={{
                background: "rgba(220,38,38,0.03)",
                border: "1px solid rgba(220,38,38,0.10)",
              }}
            >
              {!confirmDisconnect ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: "#1A1916" }}>
                      Disconnect {integration.name}
                    </p>
                    <p className="text-[12px]" style={{ color: "#8A9490" }}>
                      Removes all saved credentials
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDisconnect(true)}
                    className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                    style={{
                      border: "1px solid rgba(220,38,38,0.25)",
                      color: "#DC2626",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Link2Off className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-px" style={{ color: "#DC2626" }} />
                    <p className="text-[13px]" style={{ color: "#B91C1C" }}>
                      This will immediately remove all saved credentials for {integration.name}.
                      Any features relying on this integration will stop working.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDisconnect(false)}
                      className="text-[13px] font-medium px-3 py-1.5 rounded-lg"
                      style={{ border: "1px solid rgba(15,110,86,0.15)", color: "#4A5250" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg disabled:opacity-60"
                      style={{ background: "#DC2626", color: "#fff" }}
                    >
                      {disconnecting
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Disconnecting…</>
                        : "Yes, disconnect"
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ border: "1px solid rgba(15,110,86,0.15)", color: "#4A5250" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#0F6E56", color: "#fff" }}
          >
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
              : isEdit ? "Save Changes" : "Connect"
            }
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── IntegrationCard ─────────────────────────────────────────────────────────

interface IntegrationCardProps {
  def: IntegrationDef;
  integrationsData: IntegrationsState;
  onOpenModal: (def: IntegrationDef) => void;
  onEmailRedirect: () => void;
}

function IntegrationCard({ def, integrationsData, onOpenModal, onEmailRedirect }: IntegrationCardProps) {
  const status = deriveStatus(def, integrationsData);
  const cfg    = integrationsData[def.id] ?? null;
  const connectedSince = cfg?.connected_at ? relativeTime(cfg.connected_at) : undefined;

  const isComingSoon  = status === "coming_soon";
  const isConnectedNow = status === "connected";

  const handleClick = () => {
    if (isComingSoon) return;
    if (def.emailRedirect) { onEmailRedirect(); return; }
    onOpenModal(def);
  };

  return (
    <div
      onClick={handleClick}
      className="group flex items-center gap-4 px-5 py-4 transition-all duration-[150ms]"
      style={{
        cursor: isComingSoon ? "default" : "pointer",
        borderBottom: "1px solid var(--color-border-soft)",
      }}
      onMouseEnter={(e) => {
        if (!isComingSoon) e.currentTarget.style.background = "var(--color-bg-hover)";
      }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
    >
      {/* Logo */}
      <LogoTile id={def.id} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
            {def.name}
          </span>

          {def.recommended && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: "rgba(15,110,86,0.10)", color: "#0F6E56" }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              Recommended
            </span>
          )}

          {def.emailRedirect && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-tertiary)" }}
            >
              Via Email Settings
            </span>
          )}
        </div>

        <p className="text-[13px] mt-0.5 leading-snug" style={{ color: "var(--color-text-tertiary)" }}>
          {def.description}
        </p>

        <div className="mt-1.5">
          <StatusBadge status={status} connectedSince={connectedSince} />
        </div>
      </div>

      {/* CTA */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        {isComingSoon ? (
          <span
            className="text-[12px] font-medium px-3 py-1 rounded-lg"
            style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-tertiary)" }}
          >
            Soon
          </span>
        ) : def.emailRedirect ? (
          <button
            onClick={(e) => { e.stopPropagation(); onEmailRedirect(); }}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{
              border: "1px solid var(--color-border-medium)",
              color: "var(--color-text-secondary)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-muted)";
              e.currentTarget.style.color = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            Configure
            <ExternalLink className="h-3 w-3" />
          </button>
        ) : isConnectedNow ? (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenModal(def); }}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{
              border: "1px solid var(--color-border-medium)",
              color: "var(--color-text-secondary)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-muted)";
              e.currentTarget.style.color = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            Configure
            <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenModal(def); }}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{ background: "#0F6E56", color: "#fff" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#0C5C47";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,110,86,0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0F6E56";
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            Connect
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── IntegrationSection ───────────────────────────────────────────────────────

interface IntegrationSectionProps {
  category: CategoryDef;
  integrationsData: IntegrationsState;
  onOpenModal: (def: IntegrationDef) => void;
  onEmailRedirect: () => void;
}

function IntegrationSection({ category, integrationsData, onOpenModal, onEmailRedirect }: IntegrationSectionProps) {
  const connectedCount = category.integrations.filter(
    (d) => deriveStatus(d, integrationsData) === "connected",
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {category.label}
          </h3>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            {category.description}
          </p>
        </div>
        {connectedCount > 0 && (
          <span
            className="text-[12px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: "rgba(15,110,86,0.10)", color: "#0F6E56" }}
          >
            {connectedCount} connected
          </span>
        )}
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--color-border-soft)",
          boxShadow: "var(--color-shadow-card)",
        }}
      >
        {category.integrations.map((def, i) => (
          <div
            key={def.id}
            style={i === category.integrations.length - 1 ? { borderBottom: "none" } : undefined}
          >
            <IntegrationCard
              def={def}
              integrationsData={integrationsData}
              onOpenModal={onOpenModal}
              onEmailRedirect={onEmailRedirect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

const IntegrationsSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [settingsId,       setSettingsId]       = useState<string | null>(null);
  const [integrationsData, setIntegrationsData] = useState<IntegrationsState>({});
  const [loading,          setLoading]          = useState(true);
  const [modalDef,         setModalDef]         = useState<IntegrationDef | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("id, integrations")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("IntegrationsSettings load error:", error);
        toast({ title: "Failed to load integrations", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data) {
        setSettingsId(data.id);
        // integrations column is JSONB — cast safely
        const raw = (data as Record<string, unknown>).integrations;
        setIntegrationsData(
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as IntegrationsState)
            : {},
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  // ── Persist helper ────────────────────────────────────────────────────────
  const persist = useCallback(
    async (next: IntegrationsState) => {
      if (settingsId) {
        const { error } = await supabase
          .from("site_settings")
          .update({ integrations: next } as Record<string, unknown>)
          .eq("id", settingsId);
        if (error) throw error;
      } else {
        // No settings row yet — insert
        const { data, error } = await supabase
          .from("site_settings")
          .insert({ integrations: next } as Record<string, unknown>)
          .select("id")
          .single();
        if (error) throw error;
        if (data) setSettingsId((data as { id: string }).id);
      }
      setIntegrationsData(next);
    },
    [settingsId],
  );

  // ── Save (connect / update) ───────────────────────────────────────────────
  const handleSave = async (id: string, fields: Record<string, string>) => {
    try {
      const next: IntegrationsState = {
        ...integrationsData,
        [id]: {
          connected_at: integrationsData[id]?.connected_at ?? new Date().toISOString(),
          ...fields,
        },
      };
      await persist(next);
      toast({ title: "Integration saved successfully" });
      setModalDef(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to save integration", description: msg, variant: "destructive" });
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = async (id: string) => {
    try {
      const next = { ...integrationsData };
      delete next[id];
      await persist(next);
      toast({ title: "Integration disconnected" });
      setModalDef(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to disconnect", description: msg, variant: "destructive" });
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const totalConnected = CATEGORIES
    .flatMap((c) => c.integrations)
    .filter((d) => deriveStatus(d, integrationsData) === "connected").length;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-accent)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <SettingsTitle
          title="Integrations"
          description="Connect third-party services to extend your platform's capabilities"
        />
        {totalConnected > 0 && (
          <div
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium"
            style={{
              background: "rgba(15,110,86,0.08)",
              color: "#0F6E56",
              border: "1px solid rgba(15,110,86,0.14)",
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {totalConnected} active
          </div>
        )}
      </div>

      {/* Category sections */}
      {CATEGORIES.map((category) => (
        <IntegrationSection
          key={category.id}
          category={category}
          integrationsData={integrationsData}
          onOpenModal={setModalDef}
          onEmailRedirect={() => navigate("/admin/settings?section=email")}
        />
      ))}

      {/* Config modal */}
      {modalDef && (
        <ConfigModal
          integration={modalDef}
          existingConfig={integrationsData[modalDef.id] ?? null}
          onSave={handleSave}
          onDisconnect={handleDisconnect}
          onClose={() => setModalDef(null)}
        />
      )}
    </div>
  );
};

export default IntegrationsSettings;
