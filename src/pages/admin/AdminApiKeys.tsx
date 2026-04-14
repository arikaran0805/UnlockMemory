/**
 * AdminApiKeys — Developer Platform
 * Full API key management UI (Stripe-style)
 * Environment-aware (test / live) with masking, reveal, copy, regenerate
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Key, Eye, EyeOff, Copy, Check, RefreshCw, AlertTriangle,
  MoreHorizontal, Trash2, Plus, ShieldAlert,
} from "lucide-react";
import { useDeveloperEnvironment } from "@/hooks/useDeveloperEnvironment";
import { EnvironmentToggle } from "@/components/developers/EnvironmentToggle";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK = {
  test: {
    publishable: "pk_test_4xK9mP2nR7vL8qE3wT6yU1sA5bC0dFjH9kM3nP6qRsT",
    secret:      "sk_test_9aB3cD5eF7gH1iJ2kL4mN6oP8qR0sTuV2wX4yZ6aBcDe",
    table: [
      { id: "1", name: "Default Test Key", prefix: "pk_test_4xK9mP", type: "Publishable", created: "Jan 15, 2024", lastUsed: "5 minutes ago" },
      { id: "2", name: "Test Secret Key",  prefix: "sk_test_9aB3cD", type: "Secret",      created: "Jan 15, 2024", lastUsed: "2 hours ago" },
      { id: "3", name: "Restricted Key",   prefix: "rk_test_2aB3cD", type: "Restricted",  created: "Mar 3, 2024",  lastUsed: "Never" },
    ],
  },
  live: {
    publishable: "pk_live_8zW3kJ6mX9vN2pQ7rT4yM1sB5cD0eGfH3iK5lM7nOqP",
    secret:      "sk_live_2uV4wX6yZ8aB0cD2eF4gH6iJ8kL0mNoPqRsTuVwXyZa",
    table: [
      { id: "1", name: "Production Key",   prefix: "pk_live_8zW3kJ", type: "Publishable", created: "Jan 15, 2024", lastUsed: "2 hours ago" },
      { id: "2", name: "Live Secret Key",  prefix: "sk_live_2uV4wX", type: "Secret",      created: "Jan 15, 2024", lastUsed: "12 minutes ago" },
      { id: "3", name: "Restricted Key",   prefix: "rk_live_5nP8qR", type: "Restricted",  created: "Mar 3, 2024",  lastUsed: "3 days ago" },
    ],
  },
};

// ─── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ value, compact = false }: { value: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 focus:outline-none"
      style={{
        background: copied ? "rgba(16,185,129,0.08)" : "rgba(15,110,86,0.06)",
        color: copied ? "#059669" : "#4A5250",
        border: `1px solid ${copied ? "rgba(16,185,129,0.2)" : "rgba(15,110,86,0.12)"}`,
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {!compact && (copied ? "Copied!" : "Copy")}
    </button>
  );
}

// ─── KeyCard ──────────────────────────────────────────────────────────────────

interface KeyCardProps {
  label: string;
  hint: string;
  value: string;
  isSecret?: boolean;
  onRegenerate?: () => void;
}

function KeyCard({ label, hint, value, isSecret = false, onRegenerate }: KeyCardProps) {
  const [revealed, setRevealed] = useState(false);
  const preview = value.slice(0, 14);
  const masked  = "•".repeat(32);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,110,86,0.10)",
        boxShadow: "0 1px 6px rgba(15,110,86,0.06)",
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{
          background: "#F9FBFA",
          borderBottom: "1px solid rgba(15,110,86,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(15,110,86,0.08)" }}
          >
            <Key className="h-4 w-4" style={{ color: "#0F6E56" }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold leading-tight" style={{ color: "#1A1916" }}>
              {label}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "#8A9490" }}>{hint}</p>
          </div>
        </div>
        {isSecret && (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: "#FEF3C7", color: "#92400E" }}
          >
            <ShieldAlert className="h-3 w-3" />
            High Security
          </span>
        )}
      </div>

      {/* Key value */}
      <div className="px-5 py-4 space-y-3">
        <div
          className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg"
          style={{
            background: "#F4F7F3",
            border: "1px solid rgba(15,110,86,0.08)",
          }}
        >
          <span className="font-mono text-[13px] tracking-wide min-w-0 truncate" style={{ color: "#1A1916" }}>
            {revealed ? value : `${preview}${masked}`}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setRevealed(!revealed)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 focus:outline-none"
              style={{
                background: "rgba(15,110,86,0.06)",
                color: "#4A5250",
                border: "1px solid rgba(15,110,86,0.12)",
              }}
            >
              {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {revealed ? "Hide" : "Reveal"}
            </button>
            <CopyButton value={value} />
          </div>
        </div>

        {isSecret && (
          <div
            className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg"
            style={{
              background: "rgba(220,38,38,0.04)",
              border: "1px solid rgba(220,38,38,0.10)",
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" style={{ color: "#DC2626" }} />
            <p className="text-[12px]" style={{ color: "#B91C1C" }}>
              Never expose this key in client-side code or public repositories.
              It grants full API access and should be stored only on your server.
            </p>
          </div>
        )}

        {isSecret && onRegenerate && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[12px]" style={{ color: "#8A9490" }}>
              Regenerating immediately invalidates the current key.
            </p>
            <Button variant="outline" size="sm" onClick={onRegenerate}>
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Regenerate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Keys Table ───────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  Publishable: { bg: "rgba(15,110,86,0.08)",    color: "#0F6E56" },
  Secret:      { bg: "rgba(220,38,38,0.07)",    color: "#DC2626" },
  Restricted:  { bg: "rgba(99,91,255,0.08)",    color: "#635BFF" },
};

function KeysTable({ rows }: { rows: typeof MOCK.test.table }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyRow = (id: string, prefix: string) => {
    navigator.clipboard.writeText(`${prefix}XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(15,110,86,0.10)",
        boxShadow: "0 1px 4px rgba(15,110,86,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="grid items-center gap-6 px-5 py-3"
        style={{
          gridTemplateColumns: "1.8fr 1.4fr 1fr 1fr 1fr 40px",
          background: "#F4F7F3",
          borderBottom: "1px solid rgba(15,110,86,0.08)",
        }}
      >
        {["Name", "Key", "Type", "Created", "Last Used", ""].map((h) => (
          <span
            key={h}
            className="text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: "#8A9490" }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const badge = TYPE_BADGE[row.type] || TYPE_BADGE.Publishable;
        return (
          <div
            key={row.id}
            className="group grid items-center gap-6 px-5 py-3.5 transition-colors duration-100"
            style={{
              gridTemplateColumns: "1.8fr 1.4fr 1fr 1fr 1fr 40px",
              background: "#FFFFFF",
              borderBottom: i < rows.length - 1 ? "1px solid rgba(15,110,86,0.06)" : "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FBFA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
          >
            <p className="text-[13px] font-medium truncate" style={{ color: "#1A1916" }}>
              {row.name}
            </p>

            <code
              className="font-mono text-[12px] px-2 py-0.5 rounded"
              style={{ background: "rgba(15,110,86,0.06)", color: "#4A5250" }}
            >
              {row.prefix}…
            </code>

            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold self-start"
              style={{ background: badge.bg, color: badge.color }}
            >
              {row.type}
            </span>

            <p className="text-[13px]" style={{ color: "#4A5250" }}>{row.created}</p>

            <p
              className="text-[13px]"
              style={{ color: row.lastUsed === "Never" ? "#8A9490" : "#4A5250" }}
            >
              {row.lastUsed}
            </p>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 focus:outline-none"
                  style={{ color: "#8A9490" }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="flex items-center gap-2 text-[13px] cursor-pointer"
                  onClick={() => copyRow(row.id, row.prefix)}
                >
                  {copiedId === row.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === row.id ? "Copied!" : "Copy key"}
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 text-[13px] cursor-pointer text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete key
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminApiKeys = () => {
  const { env, setEnv, isTest } = useDeveloperEnvironment();
  const [regenOpen, setRegenOpen] = useState(false);
  const data = MOCK[env];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold" style={{ color: "var(--admin-text)" }}>
            API Keys
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--admin-muted)" }}>
            Manage API credentials for external integrations and server-side requests
          </p>
        </div>
        <EnvironmentToggle env={env} onChange={setEnv} />
      </div>

      {/* Environment banner */}
      {isTest ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.22)",
          }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#F59E0B" }} />
          <p className="text-[13px] font-medium" style={{ color: "#92400E" }}>
            Viewing Test Mode keys — these credentials will not process real transactions.
          </p>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(15,110,86,0.05)",
            border: "1px solid rgba(15,110,86,0.15)",
          }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#10B981" }} />
          <p className="text-[13px] font-medium" style={{ color: "#065F46" }}>
            Viewing Live Mode keys — handle these credentials with care.
          </p>
        </div>
      )}

      {/* Publishable key */}
      <section className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--admin-text)" }}>
            Publishable Key
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--admin-muted)" }}>
            Safe to include in browser code, mobile apps, and public environments
          </p>
        </div>
        <KeyCard
          label="Publishable Key"
          hint="Use this in your frontend code"
          value={data.publishable}
        />
      </section>

      {/* Secret key */}
      <section className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--admin-text)" }}>
            Secret Key
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--admin-muted)" }}>
            Server-side only — never expose this in client-side code or version control
          </p>
        </div>
        <KeyCard
          label="Secret Key"
          hint="Server-side only — grants full API access"
          value={data.secret}
          isSecret
          onRegenerate={() => setRegenOpen(true)}
        />
      </section>

      {/* All keys table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--admin-text)" }}>
              All Keys
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--admin-muted)" }}>
              {data.table.length} {env === "test" ? "test" : "live"} keys
            </p>
          </div>
          <Button size="sm" className="flex items-center gap-1.5 text-[13px]">
            <Plus className="h-3.5 w-3.5" />
            Create Key
          </Button>
        </div>
        <KeysTable rows={data.table} />
      </section>

      {/* Regenerate confirmation */}
      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Regenerate Secret Key?
            </DialogTitle>
            <DialogDescription>
              This will immediately invalidate your current secret key. Any server
              or integration using the old key will stop working until updated.
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex items-start gap-2.5 p-3.5 rounded-lg"
            style={{
              background: "rgba(220,38,38,0.04)",
              border: "1px solid rgba(220,38,38,0.12)",
            }}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
            <p className="text-[13px]" style={{ color: "#B91C1C" }}>
              This action cannot be undone. Update all integrations immediately after regenerating.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setRegenOpen(false)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Regenerate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminApiKeys;
