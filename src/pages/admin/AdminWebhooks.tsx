/**
 * AdminWebhooks — Developer Platform
 * Full webhook management: endpoint list, delivery logs, add/edit/delete modal
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Webhook, Plus, ChevronDown, ChevronRight, ExternalLink,
  RefreshCw, Trash2, AlertCircle, CheckCircle2, XCircle,
  MoreHorizontal, Copy, Clock, Edit2, Zap,
} from "lucide-react";
import { useDeveloperEnvironment } from "@/hooks/useDeveloperEnvironment";
import { EnvironmentToggle } from "@/components/developers/EnvironmentToggle";
import { StatusBadge } from "@/components/developers/StatusBadge";

// ─── Types ─────────────────────────────────────────────────────────────────────

type WebhookStatus = "active" | "inactive" | "failing";

interface DeliveryLog {
  id: string;
  status: "success" | "error";
  code: number;
  event: string;
  timestamp: string;
  duration: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  lastDelivery: string;
  logs: DeliveryLog[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const ALL_EVENTS = [
  "user.created", "user.updated", "user.deleted",
  "payment.completed", "payment.failed", "payment.refunded",
  "course.enrolled", "course.completed",
  "post.published", "post.deleted",
  "webhook.test",
];

const SEED: Record<"test" | "live", WebhookEndpoint[]> = {
  test: [
    {
      id: "wh_t1",
      url: "https://staging.myapp.com/hooks/unlock",
      events: ["user.created", "payment.completed", "course.completed"],
      status: "active",
      lastDelivery: "2 minutes ago",
      logs: [
        { id: "d1", status: "success", code: 200, event: "user.created",      timestamp: "2 min ago", duration: "142ms" },
        { id: "d2", status: "success", code: 200, event: "payment.completed", timestamp: "1h ago",    duration: "89ms" },
        { id: "d3", status: "error",   code: 500, event: "course.completed",  timestamp: "3h ago",    duration: "timeout" },
        { id: "d4", status: "success", code: 200, event: "user.created",      timestamp: "5h ago",    duration: "201ms" },
      ],
    },
    {
      id: "wh_t2",
      url: "https://hooks.zapier.com/hooks/catch/12345/abcdef",
      events: ["post.published", "user.created"],
      status: "active",
      lastDelivery: "1 hour ago",
      logs: [
        { id: "d5", status: "success", code: 200, event: "post.published", timestamp: "1h ago", duration: "312ms" },
        { id: "d6", status: "success", code: 200, event: "user.created",   timestamp: "4h ago", duration: "198ms" },
      ],
    },
  ],
  live: [
    {
      id: "wh_l1",
      url: "https://api.myapp.com/hooks/unlock",
      events: ["user.created", "payment.completed", "payment.failed", "course.completed"],
      status: "active",
      lastDelivery: "4 minutes ago",
      logs: [
        { id: "d1", status: "success", code: 200, event: "payment.completed", timestamp: "4 min ago",  duration: "156ms" },
        { id: "d2", status: "success", code: 200, event: "user.created",      timestamp: "22 min ago", duration: "94ms" },
        { id: "d3", status: "success", code: 200, event: "payment.completed", timestamp: "1h ago",     duration: "112ms" },
        { id: "d4", status: "success", code: 200, event: "course.completed",  timestamp: "2h ago",     duration: "88ms" },
        { id: "d5", status: "error",   code: 503, event: "payment.failed",    timestamp: "6h ago",     duration: "timeout" },
      ],
    },
    {
      id: "wh_l2",
      url: "https://hooks.zapier.com/hooks/catch/99812/xyzuvw",
      events: ["post.published"],
      status: "inactive",
      lastDelivery: "3 days ago",
      logs: [
        { id: "d6", status: "success", code: 200, event: "post.published", timestamp: "3d ago", duration: "445ms" },
      ],
    },
    {
      id: "wh_l3",
      url: "https://api.partner.com/events/ingest",
      events: ["user.created", "user.updated", "user.deleted"],
      status: "failing",
      lastDelivery: "1 day ago",
      logs: [
        { id: "d7", status: "error", code: 502, event: "user.updated", timestamp: "1d ago",  duration: "timeout" },
        { id: "d8", status: "error", code: 502, event: "user.created", timestamp: "1d ago",  duration: "timeout" },
        { id: "d9", status: "error", code: 500, event: "user.deleted", timestamp: "2d ago",  duration: "timeout" },
      ],
    },
  ],
};

// ─── DeliveryLogRow ────────────────────────────────────────────────────────────

function DeliveryLogRow({ log }: { log: DeliveryLog }) {
  const ok = log.status === "success";
  return (
    <div
      className="flex items-center gap-4 px-5 py-2.5 text-[12px]"
      style={{ borderBottom: "1px solid rgba(15,110,86,0.04)" }}
    >
      {/* HTTP code */}
      <span
        className="font-mono font-bold w-10 flex-shrink-0 text-[13px]"
        style={{ color: ok ? "#059669" : "#DC2626" }}
      >
        {log.code}
      </span>

      {/* Icon */}
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#059669" }} />
        : <XCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#DC2626" }} />
      }

      {/* Event */}
      <code
        className="font-mono text-[11px] px-1.5 py-0.5 rounded flex-1"
        style={{ background: "rgba(15,110,86,0.06)", color: "#4A5250" }}
      >
        {log.event}
      </code>

      {/* Timestamp */}
      <span className="text-[11px] flex-shrink-0" style={{ color: "#8A9490" }}>
        {log.timestamp}
      </span>

      {/* Duration */}
      <span className="font-mono text-[11px] w-16 text-right flex-shrink-0" style={{ color: "#8A9490" }}>
        {log.duration}
      </span>

      {/* Retry */}
      {!ok && (
        <button
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex-shrink-0"
          style={{
            background: "rgba(220,38,38,0.06)",
            color: "#DC2626",
            border: "1px solid rgba(220,38,38,0.14)",
          }}
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Retry
        </button>
      )}
    </div>
  );
}

// ─── WebhookCard ──────────────────────────────────────────────────────────────

function WebhookCard({ wh, onDelete }: { wh: WebhookEndpoint; onDelete: (id: string) => void }) {
  const [logsOpen, setLogsOpen] = useState(false);

  const statusVariant = wh.status === "active" ? "active" : wh.status === "failing" ? "failing" : "inactive";
  const statusLabel   = wh.status === "active" ? "Active" : wh.status === "failing" ? "Failing" : "Inactive";

  const successRate = wh.logs.length
    ? Math.round((wh.logs.filter((l) => l.status === "success").length / wh.logs.length) * 100)
    : 100;

  return (
    <div
      className="rounded-xl overflow-hidden transition-shadow duration-200"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${wh.status === "failing" ? "rgba(220,38,38,0.18)" : "rgba(15,110,86,0.10)"}`,
        boxShadow: "0 1px 6px rgba(15,110,86,0.05)",
      }}
    >
      {/* Card body */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* URL + events */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <code
                className="font-mono text-[13px] font-medium"
                style={{ color: "#1A1916" }}
              >
                {wh.url}
              </code>
              <StatusBadge variant={statusVariant} label={statusLabel} />
            </div>

            {/* Event chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {wh.events.map((e) => (
                <span
                  key={e}
                  className="font-mono text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(15,110,86,0.05)",
                    color: "#4A5250",
                    border: "1px solid rgba(15,110,86,0.10)",
                  }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* Meta + actions */}
          <div className="flex items-start gap-3 flex-shrink-0">
            {/* Stats */}
            <div className="text-right space-y-0.5">
              <p className="text-[11px]" style={{ color: "#8A9490" }}>Last delivery</p>
              <p className="text-[12px] font-medium" style={{ color: "#4A5250" }}>{wh.lastDelivery}</p>
              {wh.logs.length > 0 && (
                <p
                  className="text-[11px] font-medium"
                  style={{ color: successRate === 100 ? "#059669" : successRate >= 75 ? "#D97706" : "#DC2626" }}
                >
                  {successRate}% success
                </p>
              )}
            </div>

            {/* Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md transition-colors focus:outline-none mt-0.5"
                  style={{ color: "#8A9490" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F7F3")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <Edit2 className="h-3.5 w-3.5" /> Edit Endpoint
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <Zap className="h-3.5 w-3.5" /> Send Test Event
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-[13px] cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(wh.url)}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy URL
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <ExternalLink className="h-3.5 w-3.5" /> Open URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 text-[13px] cursor-pointer text-destructive"
                  onClick={() => onDelete(wh.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Delivery logs toggle */}
      <button
        onClick={() => setLogsOpen(!logsOpen)}
        className="w-full flex items-center justify-between px-5 py-2.5 text-[12px] font-medium transition-colors duration-100 focus:outline-none"
        style={{
          background: logsOpen ? "#F4F7F3" : "#FAFBFA",
          borderTop: "1px solid rgba(15,110,86,0.06)",
          color: "#4A5250",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F7F3")}
        onMouseLeave={(e) => (e.currentTarget.style.background = logsOpen ? "#F4F7F3" : "#FAFBFA")}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Recent deliveries ({wh.logs.length})
        </span>
        {logsOpen
          ? <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronRight className="h-3.5 w-3.5" />
        }
      </button>

      {/* Logs panel */}
      {logsOpen && (
        <div style={{ borderTop: "1px solid rgba(15,110,86,0.06)" }}>
          {/* Column headers */}
          <div
            className="flex items-center gap-4 px-5 py-2"
            style={{
              background: "#F9FBFA",
              borderBottom: "1px solid rgba(15,110,86,0.06)",
            }}
          >
            {["Code", "", "Event", "", "Time", "Duration", ""].map((h, i) => (
              <span
                key={i}
                className={`text-[10px] font-semibold uppercase tracking-wider ${h === "" ? (i === 1 ? "w-3.5 flex-shrink-0" : "flex-1") : ""}`}
                style={{ color: "#8A9490" }}
              >
                {h}
              </span>
            ))}
          </div>
          {wh.logs.length === 0 ? (
            <p className="text-center text-[12px] py-5" style={{ color: "#8A9490" }}>
              No delivery attempts yet
            </p>
          ) : (
            wh.logs.map((log) => <DeliveryLogRow key={log.id} log={log} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Webhook Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (url: string, events: string[]) => void;
}

function AddWebhookModal({ open, onClose, onAdd }: AddModalProps) {
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["user.created"]));
  const [urlError, setUrlError] = useState("");

  const toggle = (e: string) => {
    const next = new Set(selected);
    if (next.has(e)) next.delete(e); else next.add(e);
    setSelected(next);
  };

  const handleAdd = () => {
    try { new URL(url); setUrlError(""); } catch {
      setUrlError("Please enter a valid URL starting with https://");
      return;
    }
    if (selected.size === 0) return;
    onAdd(url, Array.from(selected));
    setUrl("");
    setSelected(new Set(["user.created"]));
    setUrlError("");
    onClose();
  };

  const categoryMap: Record<string, string[]> = {
    "User events":    ["user.created", "user.updated", "user.deleted"],
    "Payment events": ["payment.completed", "payment.failed", "payment.refunded"],
    "Course events":  ["course.enrolled", "course.completed"],
    "Content events": ["post.published", "post.deleted"],
    "System":         ["webhook.test"],
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Webhook Endpoint</DialogTitle>
          <DialogDescription>
            Configure a URL to receive real-time HTTP POST notifications for selected events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* URL input */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium" style={{ color: "#4A5250" }}>
              Endpoint URL
            </label>
            <Input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
              placeholder="https://your-domain.com/webhooks"
              className="font-mono text-[13px]"
            />
            {urlError && (
              <p className="text-[12px]" style={{ color: "#DC2626" }}>{urlError}</p>
            )}
          </div>

          {/* Event selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium" style={{ color: "#4A5250" }}>
                Events to subscribe
              </label>
              <span className="text-[12px]" style={{ color: "#8A9490" }}>
                {selected.size} selected
              </span>
            </div>

            <div
              className="rounded-xl overflow-hidden divide-y"
              style={{ border: "1px solid rgba(15,110,86,0.12)" }}
            >
              {Object.entries(categoryMap).map(([cat, events]) => (
                <div key={cat}>
                  <p
                    className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: "#F9FBFA", color: "#8A9490" }}
                  >
                    {cat}
                  </p>
                  {events.map((evt) => (
                    <label
                      key={evt}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-100"
                      style={{
                        background: selected.has(evt) ? "rgba(15,110,86,0.04)" : "#FFFFFF",
                        borderTop: "1px solid rgba(15,110,86,0.05)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(evt)}
                        onChange={() => toggle(evt)}
                        className="accent-[#0F6E56] w-3.5 h-3.5 flex-shrink-0"
                      />
                      <code
                        className="font-mono text-[12px]"
                        style={{ color: selected.has(evt) ? "#0F6E56" : "#4A5250" }}
                      >
                        {evt}
                      </code>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!url.trim() || selected.size === 0}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Endpoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminWebhooks = () => {
  const { env, setEnv, isTest } = useDeveloperEnvironment();
  const [data, setData] = useState(SEED);
  const [addOpen, setAddOpen] = useState(false);

  const webhooks = data[env];
  const failingCount = webhooks.filter((w) => w.status === "failing").length;

  const handleAdd = (url: string, events: string[]) => {
    const next: WebhookEndpoint = {
      id: `wh_${Date.now()}`,
      url,
      events,
      status: "active",
      lastDelivery: "Never",
      logs: [],
    };
    setData((prev) => ({ ...prev, [env]: [...prev[env], next] }));
  };

  const handleDelete = (id: string) => {
    setData((prev) => ({ ...prev, [env]: prev[env].filter((w) => w.id !== id) }));
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold" style={{ color: "var(--admin-text)" }}>
            Webhooks
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--admin-muted)" }}>
            Receive real-time HTTP notifications when events occur on your platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <EnvironmentToggle env={env} onChange={setEnv} />
          <Button size="sm" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5 text-[13px]">
            <Plus className="h-3.5 w-3.5" />
            Add Endpoint
          </Button>
        </div>
      </div>

      {/* Failing banner */}
      {failingCount > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(220,38,38,0.05)",
            border: "1px solid rgba(220,38,38,0.18)",
          }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#DC2626" }} />
          <p className="text-[13px] font-medium" style={{ color: "#B91C1C" }}>
            {failingCount} endpoint{failingCount > 1 ? "s are" : " is"} failing.
            Check delivery logs below for details and use Retry to re-send.
          </p>
        </div>
      )}

      {/* Test mode banner */}
      {isTest && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.22)",
          }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#F59E0B" }} />
          <p className="text-[13px] font-medium" style={{ color: "#92400E" }}>
            Test Mode — only test events will be sent to these endpoints
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Endpoints", value: webhooks.length,                                             color: "#0F6E56" },
          { label: "Active",          value: webhooks.filter((w) => w.status === "active").length,        color: "#059669" },
          { label: "Failing",         value: failingCount,                                                color: failingCount > 0 ? "#DC2626" : "#8A9490" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-5 py-4"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,110,86,0.10)",
              boxShadow: "0 1px 4px rgba(15,110,86,0.04)",
            }}
          >
            <p className="text-[12px] font-medium mb-1" style={{ color: "#8A9490" }}>{s.label}</p>
            <p className="text-[28px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Webhook list / empty state */}
      {webhooks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-xl text-center"
          style={{
            background: "#FFFFFF",
            border: "2px dashed rgba(15,110,86,0.14)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(15,110,86,0.06)" }}
          >
            <Webhook className="h-7 w-7" style={{ color: "#0F6E56" }} />
          </div>
          <p className="text-[16px] font-semibold mb-1.5" style={{ color: "#1A1916" }}>
            No webhooks configured
          </p>
          <p className="text-[13px] mb-6 max-w-sm" style={{ color: "#8A9490" }}>
            Add an endpoint to start receiving real-time event notifications from your platform
          </p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Endpoint
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <WebhookCard key={wh.id} wh={wh} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AddWebhookModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  );
};

export default AdminWebhooks;
