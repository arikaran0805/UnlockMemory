import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Trash2, Save, Search, X, CheckCircle, XCircle, CalendarClock } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";

/* ─── types ─── */
interface AnnouncementBar {
  id: string;
  name: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  bg_color: string;
  text_color: string;
  is_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  target_type: string;
  target_ids: string[];
  audience: string;
}

type BarStatus = "active" | "disabled" | "expired" | "upcoming";

type FormData = {
  name: string;
  message: string;
  link_text: string;
  link_url: string;
  bg_color: string;
  text_color: string;
  is_enabled: boolean;
  start_date: string;
  end_date: string;
  priority: number;
  target_type: string;
  target_ids: string[];
  audience: string;
};

/* ─── constants ─── */
const TARGET_OPTIONS = [
  { value: "entire_site",     label: "Entire Site" },
  { value: "home",            label: "Home Page" },
  { value: "all_courses",     label: "All Courses" },
  { value: "specific_course", label: "Specific Course" },
  { value: "all_careers",     label: "All Careers" },
  { value: "specific_career", label: "Specific Career" },
  { value: "pricing",         label: "Pricing Page" },
  { value: "checkout",        label: "Checkout" },
  { value: "admin",           label: "Admin Pages" },
  { value: "custom_path",     label: "Custom Path" },
];

const AUDIENCE_OPTIONS = [
  { value: "all",        label: "Everyone" },
  { value: "logged_in",  label: "Logged In Only" },
  { value: "logged_out", label: "Logged Out Only" },
];

const emptyForm: FormData = {
  name: "",
  message: "",
  link_text: "",
  link_url: "",
  bg_color: "#18181b",
  text_color: "#ffffff",
  is_enabled: true,
  start_date: "",
  end_date: "",
  priority: 0,
  target_type: "entire_site",
  target_ids: [],
  audience: "all",
};

/* ─── helpers ─── */
function getStatusInfo(form: FormData): { label: string; cls: string; icon: React.ReactNode } {
  if (!form.is_enabled) return { label: "Disabled", cls: "bg-muted text-muted-foreground", icon: <XCircle className="h-3 w-3" /> };
  if (form.end_date && isPast(new Date(form.end_date))) return { label: "Expired", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: <XCircle className="h-3 w-3" /> };
  if (form.start_date && isFuture(new Date(form.start_date))) return { label: "Upcoming", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <CalendarClock className="h-3 w-3" /> };
  return { label: "Active", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: <CheckCircle className="h-3 w-3" /> };
}

/* ══════════════════════════════════════════════════════════════ */

const AdminAnnouncementBarEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [allCareers, setAllCareers] = useState<{ id: string; name: string }[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string; name: string }[]>([]);
  const [itemSearch, setItemSearch] = useState("");

  /* ─── fetch select options ─── */
  useEffect(() => {
    Promise.all([
      supabase.from("careers").select("id, name").order("name"),
      supabase.from("courses").select("id, name").order("name"),
    ]).then(([careersRes, coursesRes]) => {
      if (careersRes.data) setAllCareers(careersRes.data as { id: string; name: string }[]);
      if (coursesRes.data) setAllCourses(coursesRes.data as { id: string; name: string }[]);
    });
  }, []);

  /* ─── fetch for edit ─── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (supabase as any)
      .from("announcement_bars")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }: any) => {
        if (error || !data) {
          toast({ title: "Announcement bar not found", variant: "destructive" });
          navigate("/admin/announcement-bars");
          return;
        }
        const b = data as AnnouncementBar;
        setFormData({
          name: b.name,
          message: b.message,
          link_text: b.link_text ?? "",
          link_url: b.link_url ?? "",
          bg_color: b.bg_color,
          text_color: b.text_color,
          is_enabled: b.is_enabled,
          start_date: b.start_date ? b.start_date.split("T")[0] : "",
          end_date: b.end_date ? b.end_date.split("T")[0] : "",
          priority: b.priority,
          target_type: b.target_type,
          target_ids: b.target_ids ?? [],
          audience: b.audience,
        });
        setLoading(false);
      });
  }, [id]);

  /* ─── validation ─── */
  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) errors.name = "Internal name is required.";
    if (!formData.message.trim()) errors.message = "Message is required.";
    if (formData.link_text && !formData.link_url) errors.link_url = "Link URL is required when link text is set.";
    if (formData.link_url && !formData.link_text) errors.link_text = "Link text is required when link URL is set.";
    if (["specific_course", "specific_career"].includes(formData.target_type) && formData.target_ids.length === 0)
      errors.target_ids = `Select at least one ${formData.target_type === "specific_course" ? "course" : "career"}.`;
    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date))
      errors.end_date = "End date must be after start date.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ─── save ─── */
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);

    const payload = {
      name: formData.name.trim(),
      message: formData.message.trim(),
      link_text: formData.link_text.trim() || null,
      link_url: formData.link_url.trim() || null,
      bg_color: formData.bg_color,
      text_color: formData.text_color,
      is_enabled: formData.is_enabled,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      priority: formData.priority,
      target_type: formData.target_type,
      target_ids: formData.target_ids,
      audience: formData.audience,
    };

    if (isEdit) {
      const { error } = await (supabase as any).from("announcement_bars").update(payload).eq("id", id!);
      if (error) {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Announcement bar updated" });
        navigate("/admin/announcement-bars");
      }
    } else {
      const { error } = await (supabase as any).from("announcement_bars").insert(payload);
      if (error) {
        toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Announcement bar created" });
        navigate("/admin/announcement-bars");
      }
    }
    setIsSaving(false);
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    const { error } = await (supabase as any).from("announcement_bars").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Announcement bar deleted" });
      navigate("/admin/announcement-bars");
    }
    setIsDeleting(false);
    setDeleteOpen(false);
  };

  /* ─── specific item selector helpers ─── */
  const needsItemSelector = formData.target_type === "specific_course" || formData.target_type === "specific_career";
  const selectorItems = formData.target_type === "specific_course" ? allCourses : allCareers;
  const filteredSelectorItems = selectorItems.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const toggleTargetId = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      target_ids: prev.target_ids.includes(itemId)
        ? prev.target_ids.filter((i) => i !== itemId)
        : [...prev.target_ids, itemId],
    }));
    if (formErrors.target_ids) setFormErrors((e) => ({ ...e, target_ids: undefined }));
  };

  const statusInfo = getStatusInfo(formData);

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
              {isEdit ? "Edit Announcement Bar" : "New Announcement Bar"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Update this announcement bar's details." : "Configure a new targeted announcement banner."}
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
            <Button variant="outline" onClick={() => navigate("/admin/announcement-bars")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving
                ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving…</>
                : <><Save className="h-4 w-4" />{isEdit ? "Save Changes" : "Create Announcement"}</>
              }
            </Button>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ── Left: main content ── */}
          <div className="flex flex-col gap-5">

            {/* Content */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Content</h2>

              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Internal Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (formErrors.name) setFormErrors({ ...formErrors, name: undefined }); }}
                  placeholder="e.g. Black Friday — Courses Page"
                />
                {formErrors.name
                  ? <p className="text-xs text-destructive">{formErrors.name}</p>
                  : <p className="text-xs text-muted-foreground">Only visible to admins, not shown to visitors.</p>
                }
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="message"
                  value={formData.message}
                  onChange={(e) => { setFormData({ ...formData, message: e.target.value }); if (formErrors.message) setFormErrors({ ...formErrors, message: undefined }); }}
                  placeholder="🎉 Limited time offer — 50% off all courses!"
                />
                {formErrors.message && <p className="text-xs text-destructive">{formErrors.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="link_text">CTA Link Text</Label>
                  <Input
                    id="link_text"
                    value={formData.link_text}
                    onChange={(e) => { setFormData({ ...formData, link_text: e.target.value }); if (formErrors.link_text) setFormErrors({ ...formErrors, link_text: undefined }); }}
                    placeholder="Shop now →"
                  />
                  {formErrors.link_text && <p className="text-xs text-destructive">{formErrors.link_text}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="link_url">CTA URL</Label>
                  <Input
                    id="link_url"
                    value={formData.link_url}
                    onChange={(e) => { setFormData({ ...formData, link_url: e.target.value }); if (formErrors.link_url) setFormErrors({ ...formErrors, link_url: undefined }); }}
                    placeholder="/courses or https://…"
                  />
                  {formErrors.link_url && <p className="text-xs text-destructive">{formErrors.link_url}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.bg_color}
                      onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                      className="w-10 h-9 rounded border cursor-pointer shrink-0"
                    />
                    <Input
                      value={formData.bg_color}
                      onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                      className="font-mono text-sm"
                      placeholder="#18181b"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Text Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-10 h-9 rounded border cursor-pointer shrink-0"
                    />
                    <Input
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="font-mono text-sm"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              {/* Live preview */}
              <div className="space-y-1.5">
                <Label>Live Preview</Label>
                <div className="rounded-md overflow-hidden border border-border">
                  <div
                    className="py-2 px-4 text-center text-sm font-medium relative"
                    style={{ backgroundColor: formData.bg_color, color: formData.text_color }}
                  >
                    <span>{formData.message || "Your announcement message here…"}</span>
                    {formData.link_text && (
                      <span className="ml-2 underline underline-offset-2 font-semibold">
                        {formData.link_text}
                      </span>
                    )}
                    <span
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded opacity-60"
                      style={{ color: formData.text_color }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Targeting */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Targeting</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Page Target <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(v) => setFormData({ ...formData, target_type: v, target_ids: [] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TARGET_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Audience</Label>
                  <Select
                    value={formData.audience}
                    onValueChange={(v) => setFormData({ ...formData, audience: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_OPTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom path input */}
              {formData.target_type === "custom_path" && (
                <div className="space-y-1.5">
                  <Label>Custom Path Pattern</Label>
                  <Input
                    value={formData.target_ids[0] ?? ""}
                    onChange={(e) => setFormData({ ...formData, target_ids: [e.target.value] })}
                    placeholder="/blog/.*  or  /careers/.*"
                  />
                  <p className="text-xs text-muted-foreground">JavaScript regex pattern tested against the pathname.</p>
                </div>
              )}

              {/* Specific item selector */}
              {needsItemSelector && (
                <div className="space-y-1.5">
                  <Label>
                    Select {formData.target_type === "specific_course" ? "Courses" : "Careers"}
                    <span className="text-destructive ml-0.5">*</span>
                  </Label>

                  {formData.target_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.target_ids.map((tid) => {
                        const item = selectorItems.find((i) => i.id === tid);
                        return item ? (
                          <Badge key={tid} variant="secondary" className="gap-1 pr-1">
                            {item.name}
                            <button
                              onClick={() => toggleTargetId(tid)}
                              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="border rounded-md">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder={`Search ${formData.target_type === "specific_course" ? "courses" : "careers"}…`}
                        className="border-0 border-b rounded-none pl-8 h-9 focus-visible:ring-0"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {filteredSelectorItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">Nothing found.</p>
                      ) : (
                        filteredSelectorItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleTargetId(item.id)}
                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left"
                          >
                            <Checkbox
                              checked={formData.target_ids.includes(item.id)}
                              className="pointer-events-none"
                            />
                            <span className={formData.target_ids.includes(item.id) ? "font-medium" : ""}>
                              {item.name}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  {formErrors.target_ids && <p className="text-xs text-destructive">{formErrors.target_ids}</p>}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: settings ── */}
          <div className="flex flex-col gap-4">

            {/* Status */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Status</h2>
                <Badge variant="outline" className={`text-xs font-medium gap-1 ${statusInfo.cls}`}>
                  {statusInfo.icon}{statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enabled</p>
                  <p className="text-xs text-muted-foreground">Show this bar to visitors</p>
                </div>
                <Switch
                  checked={formData.is_enabled}
                  onCheckedChange={(v) => setFormData({ ...formData, is_enabled: v })}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Schedule</h2>

              <div className="space-y-1.5">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Leave blank to show immediately.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => { setFormData({ ...formData, end_date: e.target.value }); if (formErrors.end_date) setFormErrors({ ...formErrors, end_date: undefined }); }}
                />
                {formErrors.end_date && <p className="text-xs text-destructive">{formErrors.end_date}</p>}
                <p className="text-xs text-muted-foreground">Leave blank to run indefinitely.</p>
              </div>

              {formData.start_date && formData.end_date && !formErrors.end_date && (
                <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2 bg-muted/30">
                  Running {format(new Date(formData.start_date), "dd MMM yyyy")} →{" "}
                  {format(new Date(formData.end_date), "dd MMM yyyy")}
                </p>
              )}
            </div>

            {/* Priority */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Priority</h2>
              <Input
                type="number"
                min={0}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Higher number = shown first when multiple bars match the same page.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement Bar?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{formData.name}</strong>. This cannot be undone.
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

export default AdminAnnouncementBarEditor;
