/**
 * IntegrationsSettings — production-grade integrations dashboard.
 * Architecture:
 *   IntegrationsSettings
 *     └── IntegrationSection (per category)
 *           └── IntegrationCard
 *                 ├── LogoTile (brand-colored)
 *                 ├── IntegrationInfo + IntegrationStatusBadge
 *                 └── ConnectButton
 *     └── Webhooks panel
 *     └── API Keys panel
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Webhook, Key, ExternalLink, Eye, EyeOff,
  CheckCircle2, Circle, ArrowRight, Loader2, Sparkles, Clock,
} from "lucide-react";
import { SettingsTitle, SettingsLabel, SettingsHint } from "../SettingsCard";

// ─── Brand color palette ────────────────────────────────────────────────────

const BRAND: Record<string, { bg: string; text: string; abbr: string }> = {
  "google-analytics": { bg: "#E37400", text: "#fff",    abbr: "GA" },
  "google-ads":       { bg: "#4285F4", text: "#fff",    abbr: "Ads" },
  "meta-ads":         { bg: "#0082FB", text: "#fff",    abbr: "Meta" },
  "stripe":           { bg: "#635BFF", text: "#fff",    abbr: "S" },
  "razorpay":         { bg: "#2D81EE", text: "#fff",    abbr: "Rz" },
  "resend":           { bg: "#1A1A1A", text: "#fff",    abbr: "Re" },
  "sendgrid":         { bg: "#1A82E2", text: "#fff",    abbr: "SG" },
  "cloudflare":       { bg: "#F38020", text: "#fff",    abbr: "CF" },
};

// ─── Integration data model ─────────────────────────────────────────────────

type IntegrationStatus = "connected" | "not_connected" | "coming_soon";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  connectedSince?: string;
  recommended?: boolean;
  emailRedirect?: boolean; // sends user to Email Settings instead of config
  configPath?: string;
}

interface Category {
  id: string;
  label: string;
  description: string;
  integrations: Integration[];
}

// ─── Integration registry ────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "analytics",
    label: "Analytics & Advertising",
    description: "Track performance, measure conversions, and run campaigns",
    integrations: [
      {
        id: "google-analytics",
        name: "Google Analytics",
        description: "Track page views, sessions, and user behavior across your platform",
        status: "connected",
        connectedSince: "3 days ago",
      },
      {
        id: "google-ads",
        name: "Google Ads",
        description: "Measure ad conversions and sync audiences from your learner base",
        status: "not_connected",
      },
      {
        id: "meta-ads",
        name: "Meta Ads",
        description: "Run retargeting campaigns and track Facebook & Instagram ad ROI",
        status: "not_connected",
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
        status: "not_connected",
        recommended: true,
      },
      {
        id: "razorpay",
        name: "Razorpay",
        description: "Accept payments in India via UPI, cards, and net banking",
        status: "not_connected",
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
        status: "not_connected",
        recommended: true,
        emailRedirect: true,
      },
      {
        id: "sendgrid",
        name: "SendGrid",
        description: "High-volume transactional and marketing email at scale",
        status: "not_connected",
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
        status: "connected",
        connectedSince: "12 days ago",
      },
    ],
  },
];

// ─── IntegrationStatusBadge ─────────────────────────────────────────────────

const IntegrationStatusBadge = ({
  status,
  connectedSince,
}: {
  status: IntegrationStatus;
  connectedSince?: string;
}) => {
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
        <span className="text-[12px]" style={{ color: "var(--admin-muted)" }}>
          Coming soon
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--admin-muted)", opacity: 0.4 }} />
      <span className="text-[12px]" style={{ color: "var(--admin-muted)" }}>
        Not connected
      </span>
    </div>
  );
};

// ─── LogoTile ───────────────────────────────────────────────────────────────

const LogoTile = ({ id }: { id: string }) => {
  const brand = BRAND[id] ?? { bg: "#8A9490", text: "#fff", abbr: id.slice(0, 2).toUpperCase() };
  return (
    <div
      className="h-10 w-10 rounded-[10px] flex items-center justify-center shrink-0 select-none"
      style={{ backgroundColor: brand.bg }}
    >
      <span
        className="text-[11px] font-bold tracking-tight leading-none"
        style={{ color: brand.text }}
      >
        {brand.abbr}
      </span>
    </div>
  );
};

// ─── ConnectButton ──────────────────────────────────────────────────────────

const ConnectButton = ({
  status,
  connecting,
  emailRedirect,
  onClick,
}: {
  status: IntegrationStatus;
  connecting: boolean;
  emailRedirect?: boolean;
  onClick: () => void;
}) => {
  if (status === "coming_soon") {
    return (
      <span
        className="text-[12px] font-medium px-3 py-1 rounded-lg"
        style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-tertiary)" }}
      >
        Soon
      </span>
    );
  }

  if (status === "connected") {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
        style={{
          border: "1px solid var(--color-border-medium)",
          color: "var(--color-text-secondary)",
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--color-accent-muted)";
          e.currentTarget.style.color = "var(--color-accent)";
          e.currentTarget.style.borderColor = "var(--color-border-strong)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--color-text-secondary)";
          e.currentTarget.style.borderColor = "var(--color-border-medium)";
        }}
      >
        Configure
        <ArrowRight className="h-3 w-3" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={connecting}
      className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: "#0F6E56",
        color: "#fff",
        border: "none",
      }}
      onMouseEnter={(e) => {
        if (!connecting) {
          e.currentTarget.style.background = "#0C5C47";
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,110,86,0.25)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#0F6E56";
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {connecting ? (
        <><Loader2 className="h-3 w-3 animate-spin" /> Connecting…</>
      ) : emailRedirect ? (
        <>Configure <ArrowRight className="h-3 w-3" /></>
      ) : (
        <>Connect <ArrowRight className="h-3 w-3" /></>
      )}
    </button>
  );
};

// ─── IntegrationCard ────────────────────────────────────────────────────────

const IntegrationCard = ({
  integration,
  onAction,
}: {
  integration: Integration;
  onAction: (integration: Integration) => void;
}) => {
  const [connecting, setConnecting] = useState(false);

  const handleClick = async () => {
    if (integration.status === "coming_soon") return;
    if (integration.emailRedirect) {
      onAction(integration);
      return;
    }
    if (integration.status === "connected") {
      onAction(integration);
      return;
    }
    setConnecting(true);
    // Simulate async connect; replace with real integration flow
    await new Promise((r) => setTimeout(r, 1200));
    setConnecting(false);
    onAction(integration);
  };

  const isConnected = integration.status === "connected";
  const isComingSoon = integration.status === "coming_soon";

  return (
    <div
      onClick={!isComingSoon ? handleClick : undefined}
      className="group flex items-center gap-4 px-5 py-4 transition-all duration-[150ms]"
      style={{
        cursor: isComingSoon ? "default" : "pointer",
        borderBottom: "1px solid var(--color-border-soft)",
      }}
      onMouseEnter={(e) => {
        if (!isComingSoon) e.currentTarget.style.background = "var(--color-bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "";
      }}
    >
      {/* Logo */}
      <LogoTile id={integration.id} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
            {integration.name}
          </span>

          {integration.recommended && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(15,110,86,0.10)",
                color: "#0F6E56",
              }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              Recommended
            </span>
          )}

          {integration.emailRedirect && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-tertiary)" }}
            >
              Via Email Settings
            </span>
          )}
        </div>

        <p className="text-[13px] mt-0.5 leading-snug" style={{ color: "var(--color-text-tertiary)" }}>
          {integration.description}
        </p>

        <div className="mt-1.5">
          <IntegrationStatusBadge
            status={integration.status}
            connectedSince={integration.connectedSince}
          />
        </div>
      </div>

      {/* Action — stop click propagation so card-click and button-click don't double-fire */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <ConnectButton
          status={integration.status}
          connecting={connecting}
          emailRedirect={integration.emailRedirect}
          onClick={handleClick}
        />
      </div>
    </div>
  );
};

// ─── IntegrationSection ──────────────────────────────────────────────────────

const IntegrationSection = ({
  category,
  onAction,
}: {
  category: Category;
  onAction: (integration: Integration) => void;
}) => {
  const connectedCount = category.integrations.filter((i) => i.status === "connected").length;

  return (
    <div>
      {/* Section header */}
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

      {/* Card container */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--color-border-soft)",
          boxShadow: "var(--color-shadow-card)",
        }}
      >
        {category.integrations.map((integration, i) => (
          <div
            key={integration.id}
            style={
              i === category.integrations.length - 1
                ? { borderBottom: "none" }
                : undefined
            }
          >
            <IntegrationCard integration={integration} onAction={onAction} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Webhooks panel ──────────────────────────────────────────────────────────

const WebhooksPanel = () => (
  <div>
    <div className="mb-3">
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Webhooks</h3>
      <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
        Push real-time events to your own endpoints when things happen on the platform
      </p>
    </div>
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--color-border-soft)",
        boxShadow: "var(--color-shadow-card)",
      }}
    >
      <div className="p-8 flex flex-col items-center text-center">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "var(--color-bg-subtle)" }}
        >
          <Webhook className="h-5 w-5" style={{ color: "var(--color-text-tertiary)" }} />
        </div>
        <p className="text-[14px] font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>
          No webhooks yet
        </p>
        <p className="text-[13px] mb-5" style={{ color: "var(--color-text-tertiary)" }}>
          Add an endpoint URL to receive event notifications
        </p>
        <button
          className="flex items-center gap-2 text-[13px] font-medium px-4 py-2 rounded-lg transition-all duration-150"
          style={{
            border: "1px solid var(--color-border-medium)",
            color: "var(--color-text-secondary)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent-muted)";
            e.currentTarget.style.color = "var(--color-accent)";
            e.currentTarget.style.borderColor = "var(--color-border-strong)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--color-text-secondary)";
            e.currentTarget.style.borderColor = "var(--color-border-medium)";
          }}
        >
          Add Webhook Endpoint
        </button>
      </div>
    </div>
  </div>
);

// ─── API Keys panel ──────────────────────────────────────────────────────────

const ApiKeysPanel = () => {
  const navigate = useNavigate();
  const [showPublic, setShowPublic] = useState(false);
  const [copied, setCopied] = useState<"public" | null>(null);

  const handleCopy = (type: "public") => {
    navigator.clipboard.writeText("pk_live_a1b2c3d4e5f6g7h8i9j0").catch(() => {});
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>API Access</h3>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
          Programmatic access to your platform data
        </p>
      </div>

      <div
        className="rounded-xl overflow-hidden divide-y"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--color-border-soft)",
          boxShadow: "var(--color-shadow-card)",
          divideColor: "var(--color-border-soft)",
        }}
      >
        {/* Public key */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SettingsLabel>Public Key</SettingsLabel>
              <p className="text-[12px] mt-0.5 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                Safe to use in client-side code
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={showPublic ? "pk_live_a1b2c3d4e5f6g7h8i9j0" : "pk_live_••••••••••••••••••••"}
                    readOnly
                    className="font-mono text-[13px] pr-9"
                    style={{
                      background: "var(--color-bg-subtle)",
                      border: "1px solid var(--color-border-soft)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                  <button
                    onClick={() => setShowPublic((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {showPublic ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  onClick={() => handleCopy("public")}
                  className="shrink-0 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                  style={{
                    border: "1px solid var(--color-border-medium)",
                    color: copied === "public" ? "#0F6E56" : "var(--color-text-secondary)",
                    background: copied === "public" ? "rgba(15,110,86,0.08)" : "transparent",
                  }}
                >
                  {copied === "public" ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Copied</span>
                  ) : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Secret key */}
        <div className="px-5 py-4">
          <SettingsLabel>Secret Key</SettingsLabel>
          <p className="text-[12px] mt-0.5 mb-3" style={{ color: "var(--color-text-tertiary)" }}>
            Keep this private — never expose in client-side code
          </p>
          <div className="flex gap-2">
            <Input
              value="sk_live_••••••••••••••••••••"
              readOnly
              className="font-mono text-[13px] flex-1"
              style={{
                background: "var(--color-bg-subtle)",
                border: "1px solid var(--color-border-soft)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              className="shrink-0 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
              style={{
                border: "1px solid rgba(220,38,38,0.25)",
                color: "#DC2626",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220,38,38,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Reveal
            </button>
          </div>
          <p className="text-[12px] mt-2 flex items-center gap-1" style={{ color: "#B45309" }}>
            <span>⚠</span> Treat this like a password — rotate it if exposed
          </p>
        </div>

        {/* Footer action */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: "var(--color-bg-subtle)" }}
        >
          <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
            Manage scopes, rotate keys, and audit usage
          </p>
          <button
            onClick={() => navigate("/admin/api")}
            className="flex items-center gap-1.5 text-[13px] font-medium transition-all duration-150"
            style={{ color: "var(--color-accent)" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Manage all keys <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── IntegrationsSettings (root) ────────────────────────────────────────────

const IntegrationsSettings = () => {
  const navigate = useNavigate();

  const handleAction = (integration: Integration) => {
    if (integration.emailRedirect) {
      navigate("/admin/settings?section=email");
      return;
    }
    // TODO: open per-integration config sheet/dialog
  };

  const totalConnected = CATEGORIES.flatMap((c) => c.integrations).filter(
    (i) => i.status === "connected",
  ).length;

  return (
    <div className="space-y-8">
      {/* Page header */}
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

      {/* Integration categories */}
      {CATEGORIES.map((category) => (
        <IntegrationSection
          key={category.id}
          category={category}
          onAction={handleAction}
        />
      ))}

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--color-border-soft)" }} />

      {/* Developer tools */}
      <div className="space-y-6">
        <div>
          <h3 className="text-[15px] font-semibold mb-0.5" style={{ color: "var(--color-text-primary)" }}>
            Developer
          </h3>
          <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
            Webhooks and API keys for custom integrations
          </p>
        </div>

        <WebhooksPanel />
        <ApiKeysPanel />
      </div>
    </div>
  );
};

export default IntegrationsSettings;
