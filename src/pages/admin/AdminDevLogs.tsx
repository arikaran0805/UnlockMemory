/**
 * AdminDevLogs — Developer Platform
 * Central event log: API requests + webhook deliveries with filters, stats, expandable rows
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight, RefreshCw, Download, Filter,
  CheckCircle2, XCircle, Clock, AlertCircle,
} from "lucide-react";
import { useDeveloperEnvironment } from "@/hooks/useDeveloperEnvironment";
import { EnvironmentToggle } from "@/components/developers/EnvironmentToggle";

// ─── Types ─────────────────────────────────────────────────────────────────────

type LogStatus = "success" | "error" | "pending";
type LogSource = "api" | "webhook";

interface LogEntry {
  id: string;
  eventType: string;
  status: LogStatus;
  statusCode: number;
  source: LogSource;
  timestamp: string;
  duration: string;
  request?: { method: string; url: string; body?: string };
  response?: { status: number; body: string };
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function makeLogs(env: "test" | "live"): LogEntry[] {
  const prefix = env === "test" ? "/api/test/v1" : "/api/v1";
  return [
    {
      id: "l01", eventType: "user.created",      status: "success", statusCode: 201,
      source: "api", timestamp: env === "test" ? "2 min ago" : "4 min ago", duration: "142ms",
      request:  { method: "POST",   url: `${prefix}/users`, body: '{"email":"new@example.com","name":"Jane Doe"}' },
      response: { status: 201, body: '{\n  "id": "usr_abc123",\n  "email": "new@example.com",\n  "created": true\n}' },
    },
    {
      id: "l02", eventType: "payment.completed",  status: "success", statusCode: 200,
      source: env === "test" ? "api" : "webhook", timestamp: "8 min ago", duration: "89ms",
      request:  { method: "POST",   url: `${prefix}/payments/confirm`, body: '{"amount":4900,"currency":"usd"}' },
      response: { status: 200, body: '{\n  "id": "pay_xyz789",\n  "status": "succeeded",\n  "amount": 4900\n}' },
    },
    {
      id: "l03", eventType: "webhook.delivered",  status: "success", statusCode: 200,
      source: "webhook", timestamp: "12 min ago", duration: "312ms",
      request:  { method: "POST",   url: "https://api.myapp.com/hooks/unlock" },
      response: { status: 200, body: '{"received": true}' },
    },
    {
      id: "l04", eventType: "webhook.failed",     status: "error",   statusCode: 502,
      source: "webhook", timestamp: "18 min ago", duration: "timeout",
      request:  { method: "POST",   url: "https://api.partner.com/events/ingest" },
      response: { status: 502, body: '{\n  "error": "Bad Gateway",\n  "message": "upstream connect error or disconnect/reset before headers"\n}' },
    },
    {
      id: "l05", eventType: "course.completed",   status: "success", statusCode: 200,
      source: "api", timestamp: "34 min ago", duration: "201ms",
      request:  { method: "PATCH",  url: `${prefix}/courses/crs_456/complete` },
      response: { status: 200, body: '{\n  "userId": "usr_abc123",\n  "courseId": "crs_456",\n  "completedAt": "2024-01-15T10:22:00Z"\n}' },
    },
    {
      id: "l06", eventType: "api.key.created",    status: "success", statusCode: 201,
      source: "api", timestamp: "1h ago", duration: "88ms",
      request:  { method: "POST",   url: `${prefix}/keys`, body: '{"name":"CI/CD Deploy Key","scopes":["read","write"]}' },
      response: { status: 201, body: '{\n  "id": "key_new123",\n  "prefix": "pk_live_...",\n  "created": true\n}' },
    },
    {
      id: "l07", eventType: "user.updated",       status: "error",   statusCode: 422,
      source: "api", timestamp: "1h ago", duration: "67ms",
      request:  { method: "PATCH",  url: `${prefix}/users/usr_999`, body: '{"email":"not-an-email"}' },
      response: { status: 422, body: '{\n  "error": "Validation failed",\n  "details": {\n    "email": "Must be a valid email address"\n  }\n}' },
    },
    {
      id: "l08", eventType: "post.published",     status: "success", statusCode: 200,
      source: "api", timestamp: "2h ago", duration: "156ms",
      request:  { method: "PATCH",  url: `${prefix}/posts/pst_789/publish` },
      response: { status: 200, body: '{\n  "id": "pst_789",\n  "status": "published",\n  "publishedAt": "2024-01-15T08:00:00Z"\n}' },
    },
    {
      id: "l09", eventType: "payment.failed",     status: "error",   statusCode: 402,
      source: env === "live" ? "webhook" : "api", timestamp: "3h ago", duration: "94ms",
      request:  { method: "POST",   url: `${prefix}/payments/charge`, body: '{"amount":9900,"currency":"usd"}' },
      response: { status: 402, body: '{\n  "error": "card_declined",\n  "message": "Your card was declined"\n}' },
    },
    {
      id: "l10", eventType: "user.deleted",       status: "success", statusCode: 204,
      source: "api", timestamp: "5h ago", duration: "203ms",
      request:  { method: "DELETE", url: `${prefix}/users/usr_old` },
      response: { status: 204, body: "" },
    },
    {
      id: "l11", eventType: "webhook.delivered",  status: "success", statusCode: 200,
      source: "webhook", timestamp: "5h ago", duration: "445ms",
      request:  { method: "POST",   url: "https://hooks.zapier.com/hooks/catch/12345/abcdef" },
      response: { status: 200, body: '{"received":true}' },
    },
    {
      id: "l12", eventType: "course.enrolled",    status: "success", statusCode: 200,
      source: "api", timestamp: "6h ago", duration: "118ms",
      request:  { method: "POST",   url: `${prefix}/enrollments`, body: '{"userId":"usr_abc123","courseId":"crs_789"}' },
      response: { status: 200, body: '{\n  "id": "enr_xyz456",\n  "enrolledAt": "2024-01-15T04:00:00Z"\n}' },
    },
  ];
}

const EVENT_TYPE_OPTS = [
  "all",
  "user.created", "user.updated", "user.deleted",
  "payment.completed", "payment.failed",
  "webhook.delivered", "webhook.failed",
  "course.enrolled", "course.completed",
  "post.published",
  "api.key.created",
];

const STATUS_OPTS  = ["all", "success", "error", "pending"];
const SOURCE_OPTS  = ["all", "api", "webhook"];

// ─── CodeBlock ────────────────────────────────────────────────────────────────

function CodeBlock({ text }: { text: string }) {
  if (!text) return <span className="text-[#8A9490] text-[12px] italic">empty body</span>;
  let fmt = text;
  try { fmt = JSON.stringify(JSON.parse(text), null, 2); } catch {}
  return (
    <pre
      className="text-[12px] font-mono p-3 rounded-lg overflow-x-auto"
      style={{ background: "#0D1117", color: "#E2E8F0", maxHeight: 220 }}
    >
      {fmt}
    </pre>
  );
}

// ─── LogRow ────────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: LogEntry }) {
  const [open, setOpen] = useState(false);

  const ok  = log.status === "success";
  const err = log.status === "error";

  return (
    <>
      {/* Summary row */}
      <div
        className="grid items-center gap-5 px-5 py-3.5 cursor-pointer transition-colors duration-100"
        style={{
          gridTemplateColumns: "24px 2fr 1fr 1fr 1.5fr 80px",
          background: open ? "#F9FBFA" : "#FFFFFF",
          borderBottom: "1px solid rgba(15,110,86,0.06)",
        }}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "#F9FBFA"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "#FFFFFF"; }}
      >
        {/* Expand chevron */}
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform duration-150 flex-shrink-0"
          style={{
            color: "#8A9490",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />

        {/* Event type */}
        <code className="font-mono text-[12px] font-medium truncate" style={{ color: "#1A1916" }}>
          {log.eventType}
        </code>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          {ok
            ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#059669" }} />
            : err
              ? <XCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#DC2626" }} />
              : <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#F59E0B" }} />
          }
          <span
            className="font-mono text-[12px] font-bold"
            style={{ color: ok ? "#059669" : err ? "#DC2626" : "#D97706" }}
          >
            {log.statusCode}
          </span>
        </div>

        {/* Source */}
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold self-start"
          style={
            log.source === "api"
              ? { background: "rgba(15,110,86,0.08)", color: "#0F6E56" }
              : { background: "rgba(99,91,255,0.08)", color: "#635BFF" }
          }
        >
          {log.source === "api" ? "API" : "Webhook"}
        </span>

        {/* Timestamp */}
        <p className="text-[12px]" style={{ color: "#8A9490" }}>{log.timestamp}</p>

        {/* Duration */}
        <p
          className="font-mono text-[12px] text-right"
          style={{ color: log.duration === "timeout" ? "#DC2626" : "#8A9490" }}
        >
          {log.duration}
        </p>
      </div>

      {/* Expanded detail */}
      {open && (
        <div
          className="px-8 py-5 space-y-4"
          style={{
            background: "#F9FBFA",
            borderBottom: "1px solid rgba(15,110,86,0.08)",
          }}
        >
          <div className="grid grid-cols-2 gap-5">
            {/* Request */}
            <div className="space-y-2">
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#8A9490" }}
              >
                Request
              </p>
              {log.request && (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(15,110,86,0.10)", color: "#0F6E56" }}
                    >
                      {log.request.method}
                    </span>
                    <code className="font-mono text-[11px] truncate" style={{ color: "#4A5250" }}>
                      {log.request.url}
                    </code>
                  </div>
                  {log.request.body && <CodeBlock text={log.request.body} />}
                </>
              )}
            </div>

            {/* Response */}
            <div className="space-y-2">
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#8A9490" }}
              >
                Response
              </p>
              {log.response && (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: log.response.status < 400 ? "rgba(16,185,129,0.10)" : "rgba(220,38,38,0.10)",
                        color: log.response.status < 400 ? "#059669" : "#DC2626",
                      }}
                    >
                      {log.response.status}
                    </span>
                  </div>
                  <CodeBlock text={log.response.body} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminDevLogs = () => {
  const { env, setEnv } = useDeveloperEnvironment();
  const [eventType, setEventType] = useState("all");
  const [statusF,   setStatusF]   = useState("all");
  const [sourceF,   setSourceF]   = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const allLogs = useMemo(() => makeLogs(env), [env, refreshKey]);

  const filtered = useMemo(() => allLogs.filter((l) => {
    if (eventType !== "all" && l.eventType !== eventType) return false;
    if (statusF   !== "all" && l.status    !== statusF)   return false;
    if (sourceF   !== "all" && l.source    !== sourceF)   return false;
    return true;
  }), [allLogs, eventType, statusF, sourceF]);

  const successCount = filtered.filter((l) => l.status === "success").length;
  const errorCount   = filtered.filter((l) => l.status === "error").length;
  const hasFilters   = eventType !== "all" || statusF !== "all" || sourceF !== "all";

  const clearFilters = () => { setEventType("all"); setStatusF("all"); setSourceF("all"); };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold" style={{ color: "var(--admin-text)" }}>
            Event Logs
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--admin-muted)" }}>
            Inspect API requests and webhook deliveries in real time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <EnvironmentToggle env={env} onChange={setEnv} />
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 focus:outline-none"
            style={{
              background: "rgba(15,110,86,0.06)",
              color: "#4A5250",
              border: "1px solid rgba(15,110,86,0.12)",
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Events",
            value: filtered.length,
            color: "#0F6E56",
            bg: "rgba(15,110,86,0.05)",
            icon: <Clock className="h-4 w-4" />,
          },
          {
            label: "Successful",
            value: successCount,
            color: "#059669",
            bg: "rgba(16,185,129,0.05)",
            icon: <CheckCircle2 className="h-4 w-4" />,
          },
          {
            label: "Errors",
            value: errorCount,
            color: errorCount > 0 ? "#DC2626" : "#9CA3AF",
            bg: errorCount > 0 ? "rgba(220,38,38,0.04)" : "rgba(156,163,175,0.05)",
            icon: <AlertCircle className="h-4 w-4" />,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,110,86,0.10)",
              boxShadow: "0 1px 4px rgba(15,110,86,0.04)",
            }}
          >
            <div>
              <p className="text-[12px] font-medium mb-1" style={{ color: "#8A9490" }}>{s.label}</p>
              <p className="text-[28px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
            </div>
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: s.bg, color: s.color }}
            >
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,110,86,0.10)",
        }}
      >
        <Filter className="h-4 w-4 flex-shrink-0" style={{ color: "#8A9490" }} />
        <p className="text-[13px] font-medium" style={{ color: "#4A5250" }}>Filter</p>

        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="w-48 h-8 text-[12px]">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPE_OPTS.map((t) => (
              <SelectItem key={t} value={t} className="text-[12px] font-mono">
                {t === "all" ? "All events" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-36 h-8 text-[12px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTS.map((s) => (
              <SelectItem key={s} value={s} className="text-[12px]">
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceF} onValueChange={setSourceF}>
          <SelectTrigger className="w-32 h-8 text-[12px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTS.map((s) => (
              <SelectItem key={s} value={s} className="text-[12px]">
                {s === "all" ? "All sources" : s === "api" ? "API" : "Webhook"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            className="ml-auto text-[12px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "#DC2626" }}
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: "1px solid rgba(15,110,86,0.10)",
          boxShadow: "0 1px 6px rgba(15,110,86,0.04)",
        }}
      >
        {/* Header */}
        <div
          className="grid items-center gap-5 px-5 py-3"
          style={{
            gridTemplateColumns: "24px 2fr 1fr 1fr 1.5fr 80px",
            background: "#F4F7F3",
            borderBottom: "1px solid rgba(15,110,86,0.08)",
          }}
        >
          {["", "Event", "Status", "Source", "Timestamp", "Duration"].map((h) => (
            <span
              key={h}
              className="text-[10px] font-bold uppercase tracking-[0.07em]"
              style={{ color: "#8A9490" }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ background: "#FFFFFF" }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-[15px] font-medium mb-1.5" style={{ color: "#1A1916" }}>
                No events match your filters
              </p>
              <p className="text-[13px] mb-4" style={{ color: "#8A9490" }}>
                Try adjusting the filters above to see more results
              </p>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            filtered.map((log) => <LogRow key={`${log.id}-${refreshKey}`} log={log} />)
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[12px]" style={{ color: "#8A9490" }}>
          Showing {filtered.length} of {allLogs.length} events
          {hasFilters && ` — ${allLogs.length - filtered.length} filtered out`}
        </p>
        <button
          className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-70 focus:outline-none"
          style={{ color: "#4A5250" }}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
    </div>
  );
};

export default AdminDevLogs;
