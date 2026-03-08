import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePromoCodes, PromoCode, PromoCodeFormData } from "@/hooks/usePromoCodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, MoreHorizontal, Copy, Pencil, Trash2, Eye, CopyPlus, Tag, Ticket, Clock, BarChart3, AlertTriangle, X, Check,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, differenceInDays } from "date-fns";
import { toast } from "@/hooks/use-toast";

/* ─── helpers ─── */
function getStatus(p: PromoCode): "active" | "expired" | "inactive" {
  if (p.expiry_date && isPast(new Date(p.expiry_date))) return "expired";
  if (!p.is_active) return "inactive";
  return "active";
}

function statusBadge(s: ReturnType<typeof getStatus>) {
  switch (s) {
    case "active":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Active</Badge>;
    case "expired":
      return <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Expired</Badge>;
    case "inactive":
      return <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>;
  }
}

function appliesToLabel(t: string) {
  const map: Record<string, string> = {
    entire_website: "Entire Website",
    all_careers: "All Careers",
    all_courses: "All Courses",
    specific_careers: "Specific Careers",
    specific_courses: "Specific Courses",
  };
  return map[t] ?? t;
}

const emptyForm: PromoCodeFormData = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 0,
  max_discount: null,
  applies_to_type: "entire_website",
  applies_to_ids: [],
  min_purchase: 0,
  usage_limit: null,
  per_user_limit: null,
  start_date: new Date().toISOString().slice(0, 16),
  expiry_date: null,
  is_active: true,
};

/* ═══════════ PAGE ═══════════ */
const AdminPromoCodes = () => {
  const { promoCodes, isLoading, create, update, remove, toggleActive, isCreating, isUpdating } = usePromoCodes();

  // UI state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeFormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PromoCode | null>(null);

  /* ─── filtered / sorted list ─── */
  const filtered = useMemo(() => {
    let list = promoCodes.map((p) => ({ ...p, _status: getStatus(p) }));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.code.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter((p) => p._status === statusFilter);
    if (typeFilter !== "all") list = list.filter((p) => p.discount_type === typeFilter);

    list.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "expiry") return (a.expiry_date ?? "9").localeCompare(b.expiry_date ?? "9");
      if (sortBy === "usage") return b.used_count - a.used_count;
      return 0;
    });
    return list;
  }, [promoCodes, search, statusFilter, typeFilter, sortBy]);

  /* ─── stats ─── */
  const stats = useMemo(() => {
    const active = promoCodes.filter((p) => getStatus(p) === "active").length;
    const expired = promoCodes.filter((p) => getStatus(p) === "expired").length;
    const totalRedemptions = promoCodes.reduce((s, p) => s + p.used_count, 0);
    return { total: promoCodes.length, active, expired, totalRedemptions };
  }, [promoCodes]);

  /* ─── form helpers ─── */
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, start_date: new Date().toISOString().slice(0, 16) });
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditingId(p.id);
    setForm({
      code: p.code,
      description: p.description ?? "",
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      max_discount: p.max_discount,
      applies_to_type: p.applies_to_type,
      applies_to_ids: p.applies_to_ids ?? [],
      min_purchase: p.min_purchase,
      usage_limit: p.usage_limit,
      per_user_limit: p.per_user_limit,
      start_date: p.start_date ? new Date(p.start_date).toISOString().slice(0, 16) : null,
      expiry_date: p.expiry_date ? new Date(p.expiry_date).toISOString().slice(0, 16) : null,
      is_active: p.is_active,
    });
    setErrors({});
    setFormOpen(true);
  };

  const openDuplicate = (p: PromoCode) => {
    setEditingId(null);
    setForm({
      code: "",
      description: p.description ?? "",
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      max_discount: p.max_discount,
      applies_to_type: p.applies_to_type,
      applies_to_ids: p.applies_to_ids ?? [],
      min_purchase: p.min_purchase,
      usage_limit: p.usage_limit,
      per_user_limit: p.per_user_limit,
      start_date: new Date().toISOString().slice(0, 16),
      expiry_date: p.expiry_date ? new Date(p.expiry_date).toISOString().slice(0, 16) : null,
      is_active: true,
    });
    setErrors({});
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Promo code is required.";
    if (!editingId && promoCodes.some((p) => p.code === form.code.toUpperCase())) e.code = "This code already exists.";
    if (form.discount_value <= 0) e.discount_value = "Discount value must be greater than 0.";
    if (form.discount_type === "percentage" && (form.discount_value < 1 || form.discount_value > 100))
      e.discount_value = "Percentage must be between 1 and 100.";
    if (form.expiry_date && form.start_date && new Date(form.expiry_date) <= new Date(form.start_date))
      e.expiry_date = "Expiry date must be after start date.";
    if (form.min_purchase < 0) e.min_purchase = "Cannot be negative.";
    if (form.usage_limit !== null && form.usage_limit < 0) e.usage_limit = "Cannot be negative.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: any = {
      ...form,
      code: form.code.toUpperCase(),
      expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
    };
    if (editingId) {
      await update({ id: editingId, ...payload });
    } else {
      await create(payload);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `"${code}" copied to clipboard.` });
  };

  /* ─── render ─── */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promo Codes</h1>
          <p className="text-muted-foreground text-sm">Create and manage discount codes for careers and courses.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Promo Code</Button>
      </div>

      {/* STATS */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Tag className="h-4 w-4" />} label="Total Promo Codes" value={stats.total} />
          <StatCard icon={<Ticket className="h-4 w-4" />} label="Active Codes" value={stats.active} accent />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Expired Codes" value={stats.expired} />
          <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Total Redemptions" value={stats.totalRedemptions} />
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search codes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="flat">Flat</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="expiry">Expiry Date</SelectItem>
              <SelectItem value="usage">Usage Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLE */}
      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No promo codes found.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="hidden md:table-cell">Applies To</TableHead>
                <TableHead className="hidden lg:table-cell">Min Purchase</TableHead>
                <TableHead className="hidden lg:table-cell">Usage</TableHead>
                <TableHead className="hidden md:table-cell">Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const nearExpiry = p.expiry_date && !isPast(new Date(p.expiry_date)) && differenceInDays(new Date(p.expiry_date), new Date()) <= 7;
                return (
                  <TableRow key={p.id} className={nearExpiry ? "bg-orange-500/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm">{p.code}</span>
                        <button onClick={() => copyCode(p.code)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {nearExpiry && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{p.discount_type}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {p.discount_type === "percentage" ? `${p.discount_value}%` : `₹${p.discount_value}`}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{appliesToLabel(p.applies_to_type)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {p.min_purchase > 0 ? `₹${p.min_purchase}` : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      <span>{p.used_count}</span>
                      {p.usage_limit && (
                        <span className="text-muted-foreground">/{p.usage_limit} ({Math.round((p.used_count / p.usage_limit) * 100)}%)</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {p.expiry_date ? format(new Date(p.expiry_date), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusBadge(p._status)}
                        {p._status !== "expired" && (
                          <Switch
                            checked={p.is_active}
                            onCheckedChange={(v) => toggleActive({ id: p.id, is_active: v })}
                            className="scale-75"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setDetailTarget(p); setDetailOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" />View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDuplicate(p)}>
                            <CopyPlus className="mr-2 h-4 w-4" />Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── CREATE / EDIT MODAL ─── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic */}
            <div className="space-y-2">
              <Label>Promo Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER25"
                className="font-mono uppercase"
              />
              {errors.code && <p className="text-destructive text-xs">{errors.code}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional note" rows={2} />
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type *</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value *</Label>
                <Input
                  type="number"
                  value={form.discount_value || ""}
                  onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                  placeholder={form.discount_type === "percentage" ? "1-100" : "₹ amount"}
                />
                {errors.discount_value && <p className="text-destructive text-xs">{errors.discount_value}</p>}
              </div>
            </div>
            {form.discount_type === "percentage" && (
              <div className="space-y-2">
                <Label>Max Discount Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.max_discount ?? ""}
                  onChange={(e) => setForm({ ...form, max_discount: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Optional cap"
                />
              </div>
            )}

            {/* Applicability */}
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={form.applies_to_type} onValueChange={(v) => setForm({ ...form, applies_to_type: v, applies_to_ids: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entire_website">Entire Website</SelectItem>
                  <SelectItem value="all_careers">All Careers</SelectItem>
                  <SelectItem value="all_courses">All Courses</SelectItem>
                  <SelectItem value="specific_careers">Specific Careers</SelectItem>
                  <SelectItem value="specific_courses">Specific Courses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific items multi-select */}
            {(form.applies_to_type === "specific_careers" || form.applies_to_type === "specific_courses") && (
              <SpecificItemsSelector
                type={form.applies_to_type === "specific_careers" ? "careers" : "courses"}
                selectedIds={form.applies_to_ids ?? []}
                onChange={(ids) => setForm({ ...form, applies_to_ids: ids })}
              />
            )}

            {/* Purchase rules */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Purchase (₹)</Label>
                <Input type="number" value={form.min_purchase || ""} onChange={(e) => setForm({ ...form, min_purchase: Number(e.target.value) })} />
                {errors.min_purchase && <p className="text-destructive text-xs">{errors.min_purchase}</p>}
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  value={form.usage_limit ?? ""}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Unlimited"
                />
                {errors.usage_limit && <p className="text-destructive text-xs">{errors.usage_limit}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Per User Limit</Label>
              <Input
                type="number"
                value={form.per_user_limit ?? ""}
                onChange={(e) => setForm({ ...form, per_user_limit: e.target.value ? Number(e.target.value) : null })}
                placeholder="Unlimited"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="datetime-local" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="datetime-local" value={form.expiry_date ?? ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value || null })} />
                {errors.expiry_date && <p className="text-destructive text-xs">{errors.expiry_date}</p>}
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating}>
              {editingId ? "Save Changes" : "Save Promo Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Promo Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-mono font-semibold">{deleteTarget?.code}</span>?
              <br />Deleted promo codes cannot be applied anymore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VIEW DETAIL ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">{detailTarget?.code}</DialogTitle>
            <DialogDescription>{detailTarget?.description || "No description"}</DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="grid grid-cols-2 gap-3 text-sm py-2">
              <Detail label="Type" value={detailTarget.discount_type} />
              <Detail label="Value" value={detailTarget.discount_type === "percentage" ? `${detailTarget.discount_value}%` : `₹${detailTarget.discount_value}`} />
              {detailTarget.max_discount && <Detail label="Max Discount" value={`₹${detailTarget.max_discount}`} />}
              <Detail label="Applies To" value={appliesToLabel(detailTarget.applies_to_type)} />
              <Detail label="Min Purchase" value={detailTarget.min_purchase > 0 ? `₹${detailTarget.min_purchase}` : "None"} />
              <Detail label="Usage" value={`${detailTarget.used_count}${detailTarget.usage_limit ? ` / ${detailTarget.usage_limit}` : ""}`} />
              {detailTarget.per_user_limit && <Detail label="Per User Limit" value={String(detailTarget.per_user_limit)} />}
              <Detail label="Start" value={detailTarget.start_date ? format(new Date(detailTarget.start_date), "dd MMM yyyy HH:mm") : "—"} />
              <Detail label="Expiry" value={detailTarget.expiry_date ? format(new Date(detailTarget.expiry_date), "dd MMM yyyy HH:mm") : "No expiry"} />
              <Detail label="Status" value={getStatus(detailTarget)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── small components ─── */
function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md p-2 ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

export default AdminPromoCodes;
