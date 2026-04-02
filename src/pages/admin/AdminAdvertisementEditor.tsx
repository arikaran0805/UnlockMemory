import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import {
  RefreshCw,
  Trash2,
  Upload,
  Save,
  ExternalLink,
} from "lucide-react";
import { format, isPast, isFuture } from "date-fns";

/* ─── constants ─── */
const PLACEMENTS = [
  { value: "courses-banner", label: "All Courses Page Banner" },
];

const AD_LABELS = [
  { value: "sponsored", label: "Sponsored" },
  { value: "partner", label: "Partner" },
  { value: "recommended", label: "Recommended" },
];

const emptyForm = {
  name: "",
  placement: "courses-banner",
  ad_label: "",
  image_url: "",
  redirect_url: "",
  ad_code: "",
  start_date: "",
  end_date: "",
  priority: 0,
  is_active: true,
};

function getStatusInfo(is_active: boolean, start_date: string, end_date: string) {
  if (!is_active) return { label: "Disabled", cls: "bg-muted text-muted-foreground" };
  if (end_date && isPast(new Date(end_date))) return { label: "Expired", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" };
  if (start_date && isFuture(new Date(start_date))) return { label: "Scheduled", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  return { label: "Active", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
}

/* ══════════════════════════════════════════════════════════════ */

const AdminAdvertisementEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [adImageUploading, setAdImageUploading] = useState(false);

  /* ─── fetch for edit ─── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("ads")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Advertisement not found", variant: "destructive" });
          navigate("/admin/monetization");
          return;
        }
        setFormData({
          name: data.name,
          placement: data.placement,
          ad_label: data.ad_label ?? "",
          image_url: data.image_url ?? "",
          redirect_url: data.redirect_url ?? "",
          ad_code: data.ad_code ?? "",
          start_date: data.start_date ? data.start_date.split("T")[0] : "",
          end_date: data.end_date ? data.end_date.split("T")[0] : "",
          priority: data.priority,
          is_active: data.is_active,
        });
        setLoading(false);
      });
  }, [id]);

  /* ─── image upload ─── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Upload JPG, PNG, GIF or WebP", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5 MB", variant: "destructive" });
      return;
    }
    setAdImageUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage.from("ad-images").upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("ad-images").getPublicUrl(fileName);
      setFormData((f) => ({ ...f, image_url: publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setAdImageUploading(false);
    }
  };

  /* ─── validation ─── */
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required.";
    if (!formData.image_url.trim() && !formData.ad_code.trim())
      errors.content = "Either an image URL or ad code is required.";
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
      placement: formData.placement,
      ad_label: formData.ad_label || null,
      image_url: formData.image_url.trim() || null,
      redirect_url: formData.redirect_url.trim() || null,
      ad_code: formData.ad_code.trim() || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      priority: Number(formData.priority),
      is_active: formData.is_active,
    };

    if (isEdit) {
      const { error } = await supabase.from("ads").update(payload).eq("id", id!);
      if (error) {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Advertisement updated" });
        navigate("/admin/monetization");
      }
    } else {
      const { error } = await supabase.from("ads").insert(payload);
      if (error) {
        toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Advertisement created" });
        navigate("/admin/monetization");
      }
    }
    setIsSaving(false);
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Advertisement deleted" });
      navigate("/admin/monetization");
    }
    setIsDeleting(false);
    setDeleteOpen(false);
  };

  const statusInfo = getStatusInfo(formData.is_active, formData.start_date, formData.end_date);

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
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isEdit ? "Edit Advertisement" : "New Advertisement"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEdit ? "Update the advertisement details below." : "Fill in the details to create a new advertisement."}
              </p>
            </div>
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
            <Button variant="outline" onClick={() => navigate("/admin/monetization")}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving
                ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving…</>
                : <><Save className="h-4 w-4" />{isEdit ? "Save Changes" : "Create Advertisement"}</>
              }
            </Button>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* ── Left: main content ── */}
          <div className="flex flex-col gap-5">

            {/* Basic info */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>

              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Ad Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, name: e.target.value }));
                    if (formErrors.name) setFormErrors((er) => ({ ...er, name: "" }));
                  }}
                  placeholder="e.g. Summer Sale Banner"
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="redirect_url">Click-through URL</Label>
                <div className="relative">
                  <Input
                    id="redirect_url"
                    value={formData.redirect_url}
                    onChange={(e) => setFormData((f) => ({ ...f, redirect_url: e.target.value }))}
                    placeholder="https://affiliate-partner.com/offer"
                    className="pr-9"
                  />
                  {formData.redirect_url && (
                    <a
                      href={formData.redirect_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Where users land when they click the ad.</p>
              </div>
            </div>

            {/* Image */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Ad Image</h2>

              <div className="flex items-center gap-3">
                <Label
                  htmlFor="image-upload"
                  className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md border border-border bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium"
                >
                  {adImageUploading
                    ? <RefreshCw className="h-4 w-4 animate-spin" />
                    : <Upload className="h-4 w-4" />
                  }
                  {adImageUploading ? "Uploading…" : "Upload Image"}
                </Label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={adImageUploading}
                />
                <span className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP — max 5 MB</span>
              </div>

              <div className="space-y-1.5">
                <Label>Or paste image URL directly</Label>
                <Input
                  placeholder="https://cdn.example.com/banner.jpg"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, image_url: e.target.value }));
                    if (formErrors.content) setFormErrors((er) => ({ ...er, content: "" }));
                  }}
                />
              </div>

              {formData.image_url && (
                <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                  <img
                    src={formData.image_url}
                    alt="Ad preview"
                    className="max-h-40 w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              {formErrors.content && <p className="text-xs text-destructive">{formErrors.content}</p>}
            </div>

            {/* Ad Code */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">AdSense / Custom HTML Code</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Optional — overrides the image if provided.</p>
              </div>
              <Textarea
                value={formData.ad_code}
                onChange={(e) => {
                  setFormData((f) => ({ ...f, ad_code: e.target.value }));
                  if (formErrors.content) setFormErrors((er) => ({ ...er, content: "" }));
                }}
                placeholder="Paste your AdSense <ins> tag or affiliate HTML here…"
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Scripts are executed safely via document fragment injection.
              </p>
            </div>
          </div>

          {/* ── Right: settings ── */}
          <div className="flex flex-col gap-4">

            {/* Status chip */}
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
                  <p className="text-xs text-muted-foreground">Show to visitors immediately</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </div>

            {/* Placement + Label */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Placement & Label</h2>

              <div className="space-y-1.5">
                <Label>Placement</Label>
                <Select
                  value={formData.placement}
                  onValueChange={(v) => setFormData((f) => ({ ...f, placement: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Ad Label</Label>
                <Select
                  value={formData.ad_label || "none"}
                  onValueChange={(v) => setFormData((f) => ({ ...f, ad_label: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No label</SelectItem>
                    {AD_LABELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Shown at the top-right corner of the ad.</p>
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
                  onChange={(e) => setFormData((f) => ({ ...f, start_date: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Leave blank to show immediately.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, end_date: e.target.value }));
                    if (formErrors.end_date) setFormErrors((er) => ({ ...er, end_date: "" }));
                  }}
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
                id="priority"
                type="number"
                min={0}
                value={formData.priority}
                onChange={(e) => setFormData((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Higher number = shown first when multiple ads share the same placement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advertisement?</AlertDialogTitle>
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

export default AdminAdvertisementEditor;
