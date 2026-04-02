import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePromoCodes, PromoCode, PromoCodeFormData } from "@/hooks/usePromoCodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Trash2, Save, Search, X } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { toast } from "@/hooks/use-toast";

/* ─── helpers ─── */
function getStatusInfo(is_active: boolean, start_date: string | null, expiry_date: string | null) {
  if (!is_active) return { label: "Inactive", cls: "bg-muted text-muted-foreground" };
  if (expiry_date && isPast(new Date(expiry_date))) return { label: "Expired", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" };
  if (start_date && isFuture(new Date(start_date))) return { label: "Scheduled", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  return { label: "Active", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
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

/* ══════════════════════════════════════════════════════════════ */

const AdminPromoCodeEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { create, update, remove, isCreating, isUpdating } = usePromoCodes();

  const [form, setForm] = useState<PromoCodeFormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ─── fetch for edit ─── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("promo_codes")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Promo code not found", variant: "destructive" });
          navigate("/admin/promo-codes");
          return;
        }
        const p = data as PromoCode;
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
        setLoading(false);
      });
  }, [id]);

  /* ─── validation ─── */
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Promo code is required.";
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

  /* ─── save ─── */
  const handleSave = async () => {
    if (!validate()) return;
    const payload: any = {
      ...form,
      code: form.code.toUpperCase(),
      expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
    };
    try {
      if (isEdit) {
        await update({ id: id!, ...payload });
      } else {
        await create(payload);
      }
      navigate("/admin/promo-codes");
    } catch {
      // errors already toasted by the hook
    }
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await remove(id);
      navigate("/admin/promo-codes");
    } catch {
      // errors already toasted
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const isSaving = isCreating || isUpdating;
  const statusInfo = getStatusInfo(form.is_active, form.start_date, form.expiry_date);

  /* ══════════ render ══════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />Loading…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-0">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEdit ? "Edit Promo Code" : "New Promo Code"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Update the promo code details below." : "Fill in the details to create a new promo code."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isEdit && (
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/admin/promo-codes")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving
                ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving…</>
                : <><Save className="h-4 w-4" />{isEdit ? "Save Changes" : "Create Promo Code"}</>
              }
            </Button>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ── Left: main content ── */}
          <div className="flex flex-col gap-5">

            {/* Basic Info */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>

              <div className="space-y-1.5">
                <Label htmlFor="code">
                  Promo Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
                    if (errors.code) setErrors((er) => ({ ...er, code: "" }));
                  }}
                  placeholder="e.g. SUMMER25"
                  className="font-mono uppercase"
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional internal note about this code…"
                  rows={3}
                />
              </div>
            </div>

            {/* Discount */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Discount</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Discount Type <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.discount_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, discount_type: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="discount_value">
                    Discount Value <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    value={form.discount_value || ""}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, discount_value: Number(e.target.value) }));
                      if (errors.discount_value) setErrors((er) => ({ ...er, discount_value: "" }));
                    }}
                    placeholder={form.discount_type === "percentage" ? "1–100" : "Amount in ₹"}
                  />
                  {errors.discount_value && <p className="text-xs text-destructive">{errors.discount_value}</p>}
                </div>
              </div>

              {form.discount_type === "percentage" && (
                <div className="space-y-1.5">
                  <Label htmlFor="max_discount">Max Discount Amount (₹)</Label>
                  <Input
                    id="max_discount"
                    type="number"
                    value={form.max_discount ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, max_discount: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="Optional cap on discount value"
                  />
                </div>
              )}
            </div>

            {/* Applicability */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Applicability</h2>

              <div className="space-y-1.5">
                <Label>Applies To</Label>
                <Select
                  value={form.applies_to_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, applies_to_type: v, applies_to_ids: [] }))}
                >
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

              {(form.applies_to_type === "specific_careers" || form.applies_to_type === "specific_courses") && (
                <SpecificItemsSelector
                  type={form.applies_to_type === "specific_careers" ? "careers" : "courses"}
                  selectedIds={form.applies_to_ids ?? []}
                  onChange={(ids) => setForm((f) => ({ ...f, applies_to_ids: ids }))}
                />
              )}
            </div>
          </div>

          {/* ── Right: settings ── */}
          <div className="flex flex-col gap-4">

            {/* Status */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Status</h2>
                <Badge variant="outline" className={`text-xs font-medium ${statusInfo.cls}`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Allow this code to be redeemed</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </div>

            {/* Usage Limits */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Usage Limits</h2>

              <div className="space-y-1.5">
                <Label htmlFor="min_purchase">Min Purchase (₹)</Label>
                <Input
                  id="min_purchase"
                  type="number"
                  value={form.min_purchase || ""}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, min_purchase: Number(e.target.value) }));
                    if (errors.min_purchase) setErrors((er) => ({ ...er, min_purchase: "" }));
                  }}
                  placeholder="0 = no minimum"
                />
                {errors.min_purchase && <p className="text-xs text-destructive">{errors.min_purchase}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usage_limit">Total Usage Limit</Label>
                <Input
                  id="usage_limit"
                  type="number"
                  value={form.usage_limit ?? ""}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, usage_limit: e.target.value ? Number(e.target.value) : null }));
                    if (errors.usage_limit) setErrors((er) => ({ ...er, usage_limit: "" }));
                  }}
                  placeholder="Leave blank for unlimited"
                />
                {errors.usage_limit && <p className="text-xs text-destructive">{errors.usage_limit}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="per_user_limit">Per User Limit</Label>
                <Input
                  id="per_user_limit"
                  type="number"
                  value={form.per_user_limit ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, per_user_limit: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Leave blank for unlimited"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Schedule</h2>

              <div className="space-y-1.5">
                <Label htmlFor="start_date">Start Date & Time</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={form.start_date ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value || null }))}
                />
                <p className="text-xs text-muted-foreground">Leave blank to activate immediately.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expiry_date">Expiry Date & Time</Label>
                <Input
                  id="expiry_date"
                  type="datetime-local"
                  value={form.expiry_date ?? ""}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, expiry_date: e.target.value || null }));
                    if (errors.expiry_date) setErrors((er) => ({ ...er, expiry_date: "" }));
                  }}
                />
                {errors.expiry_date && <p className="text-xs text-destructive">{errors.expiry_date}</p>}
                <p className="text-xs text-muted-foreground">Leave blank to never expire.</p>
              </div>

              {form.start_date && form.expiry_date && !errors.expiry_date && (
                <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/30">
                  Valid {format(new Date(form.start_date), "dd MMM yyyy, HH:mm")} →{" "}
                  {format(new Date(form.expiry_date), "dd MMM yyyy, HH:mm")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promo Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong className="font-mono">{form.code}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/* ─── Specific items multi-select ─── */
function SpecificItemsSelector({
  type,
  selectedIds,
  onChange,
}: {
  type: "careers" | "courses";
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [itemSearch, setItemSearch] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: [type === "careers" ? "careers-list" : "courses-list"],
    queryFn: async () => {
      if (type === "careers") {
        const { data, error } = await supabase.from("careers").select("id, name").order("name");
        if (error) throw error;
        return data as { id: string; name: string }[];
      } else {
        const { data, error } = await supabase.from("courses").select("id, name").order("name");
        if (error) throw error;
        return data as { id: string; name: string }[];
      }
    },
  });

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedItems = items.filter((i) => selectedIds.includes(i.id));

  return (
    <div className="space-y-2">
      <Label>Select {type === "careers" ? "Careers" : "Courses"}</Label>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
              {item.name}
              <button onClick={() => toggle(item.id)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="border rounded-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder={`Search ${type}…`}
            className="border-0 border-b rounded-none pl-8 h-9 focus-visible:ring-0"
          />
        </div>
        <div className="max-h-40 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No {type} found.</p>
          ) : (
            filtered.map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left"
                >
                  <Checkbox checked={checked} className="pointer-events-none" />
                  <span className={checked ? "font-medium" : ""}>{item.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPromoCodeEditor;
