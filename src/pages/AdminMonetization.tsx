import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, DollarSign, Code, Upload, Copy, RefreshCw, Megaphone, CheckCircle, XCircle, CalendarClock } from "lucide-react";
import { format } from "date-fns";

interface Ad {
  id: string;
  name: string;
  placement: string;
  ad_code: string | null;
  image_url: string | null;
  redirect_url: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_at: string;
}

const PLACEMENTS = [
  { value: "header", label: "Header" },
  { value: "sidebar", label: "Sidebar" },
  { value: "sidebar-2", label: "Sidebar 2" },
  { value: "sidebar-3", label: "Sidebar 3" },
  { value: "footer", label: "Footer" },
  { value: "in-content", label: "In Content" },
  { value: "before-comments", label: "Before Comments" },
  { value: "after-post", label: "After Post" },
];

const AdminMonetization = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    placement: "sidebar",
    ad_code: "",
    image_url: "",
    redirect_url: "",
    is_active: true,
    start_date: "",
    end_date: "",
    priority: 0,
  });
  const [adImageUploading, setAdImageUploading] = useState(false);

  // Embed code generator state
  const [embedImageUrl, setEmbedImageUrl] = useState("");
  const [embedRedirectUrl, setEmbedRedirectUrl] = useState("");
  const [embedWidth, setEmbedWidth] = useState("300");
  const [embedHeight, setEmbedHeight] = useState("250");
  const [embedAltText, setEmbedAltText] = useState("");
  const [generatedEmbedCode, setGeneratedEmbedCode] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string }[]>([]);

  // Announcement bar settings
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementLinkText, setAnnouncementLinkText] = useState("");
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState("");
  const [announcementBgColor, setAnnouncementBgColor] = useState("#22c55e");
  const [announcementTextColor, setAnnouncementTextColor] = useState("#ffffff");
  const [announcementStartDate, setAnnouncementStartDate] = useState("");
  const [announcementEndDate, setAnnouncementEndDate] = useState("");
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    fetchAds();
    fetchUploadedImages();
    fetchAnnouncementSettings();
  };

  const fetchAnnouncementSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("announcement_enabled, announcement_message, announcement_link_text, announcement_link_url, announcement_bg_color, announcement_text_color, announcement_start_date, announcement_end_date")
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setAnnouncementEnabled(data.announcement_enabled || false);
      setAnnouncementMessage(data.announcement_message || "");
      setAnnouncementLinkText(data.announcement_link_text || "");
      setAnnouncementLinkUrl(data.announcement_link_url || "");
      setAnnouncementBgColor(data.announcement_bg_color || "#22c55e");
      setAnnouncementTextColor(data.announcement_text_color || "#ffffff");
      setAnnouncementStartDate(data.announcement_start_date ? data.announcement_start_date.split("T")[0] : "");
      setAnnouncementEndDate(data.announcement_end_date ? data.announcement_end_date.split("T")[0] : "");
    }
  };

  const saveAnnouncementSettings = async () => {
    setSavingAnnouncement(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        announcement_enabled: announcementEnabled,
        announcement_message: announcementMessage,
        announcement_link_text: announcementLinkText,
        announcement_link_url: announcementLinkUrl,
        announcement_bg_color: announcementBgColor,
        announcement_text_color: announcementTextColor,
        announcement_start_date: announcementStartDate || null,
        announcement_end_date: announcementEndDate || null,
      })
      .eq("id", (await supabase.from("site_settings").select("id").limit(1).single()).data?.id);

    if (error) {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } else {
      toast({ title: "Announcement settings saved" });
    }
    setSavingAnnouncement(false);
  };

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      toast({ title: "Error fetching ads", variant: "destructive" });
    } else {
      setAds(data || []);
    }
    setLoading(false);
  };

  // Fetch uploaded ad images
  const fetchUploadedImages = async () => {
    try {
      const { data, error } = await supabase.storage.from("ad-images").list();
      if (error) throw error;
      
      const images = data
        .filter(file => file.name !== ".emptyFolderPlaceholder")
        .map(file => ({
          name: file.name,
          url: supabase.storage.from("ad-images").getPublicUrl(file.name).data.publicUrl
        }));
      setUploadedImages(images);
    } catch (error) {
      console.error("Error fetching uploaded images:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, GIF, or WebP image", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 5MB", variant: "destructive" });
      return;
    }

    setUploadingImage(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage.from("ad-images").upload(fileName, file);
      
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("ad-images").getPublicUrl(fileName);
      setEmbedImageUrl(publicUrl);
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setEmbedWidth(img.width.toString());
        setEmbedHeight(img.height.toString());
      };
      img.src = URL.createObjectURL(file);

      toast({ title: "Image uploaded", description: "Ad image uploaded successfully" });
      fetchUploadedImages();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (fileName: string) => {
    try {
      const { error } = await supabase.storage.from("ad-images").remove([fileName]);
      if (error) throw error;
      toast({ title: "Deleted", description: "Image deleted successfully" });
      fetchUploadedImages();
      // Clear the URL if it matches the deleted image
      if (embedImageUrl.includes(fileName)) {
        setEmbedImageUrl("");
      }
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  const generateEmbedCode = () => {
    if (!embedImageUrl) {
      toast({ title: "Error", description: "Please enter an image URL", variant: "destructive" });
      return;
    }
    const code = embedRedirectUrl
      ? `<a href="${embedRedirectUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;">
  <img src="${embedImageUrl}" alt="${embedAltText || 'Advertisement'}" width="${embedWidth}" height="${embedHeight}" style="max-width:100%;height:auto;border:0;" />
</a>`
      : `<img src="${embedImageUrl}" alt="${embedAltText || 'Advertisement'}" width="${embedWidth}" height="${embedHeight}" style="max-width:100%;height:auto;border:0;" />`;
    setGeneratedEmbedCode(code);
    toast({ title: "Code Generated", description: "Embed code has been generated successfully" });
  };

  const openCreateDialog = () => {
    setSelectedAd(null);
    setFormData({
      name: "",
      placement: "sidebar",
      ad_code: "",
      image_url: "",
      redirect_url: "",
      is_active: true,
      start_date: "",
      end_date: "",
      priority: 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (ad: Ad) => {
    setSelectedAd(ad);
    setFormData({
      name: ad.name,
      placement: ad.placement,
      ad_code: ad.ad_code || "",
      image_url: ad.image_url || "",
      redirect_url: ad.redirect_url || "",
      is_active: ad.is_active,
      start_date: ad.start_date ? ad.start_date.split("T")[0] : "",
      end_date: ad.end_date ? ad.end_date.split("T")[0] : "",
      priority: ad.priority,
    });
    setDialogOpen(true);
  };

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, GIF, or WebP image", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 5MB", variant: "destructive" });
      return;
    }

    setAdImageUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage.from("ad-images").upload(fileName, file);
      
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("ad-images").getPublicUrl(fileName);
      setFormData({ ...formData, image_url: publicUrl });
      
      toast({ title: "Image uploaded", description: "Ad image uploaded successfully" });
      fetchUploadedImages();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setAdImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    if (!formData.image_url && !formData.ad_code?.trim()) {
      toast({ title: "Image URL or Ad Code is required", variant: "destructive" });
      return;
    }

    const adData = {
      name: formData.name.trim(),
      placement: formData.placement,
      ad_code: formData.ad_code || null,
      image_url: formData.image_url || null,
      redirect_url: formData.redirect_url || null,
      is_active: formData.is_active,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      priority: formData.priority,
    };

    if (selectedAd) {
      const { error } = await supabase
        .from("ads")
        .update(adData)
        .eq("id", selectedAd.id);

      if (error) {
        toast({ title: "Failed to update ad", variant: "destructive" });
      } else {
        toast({ title: "Ad updated" });
        fetchAds();
      }
    } else {
      const { error } = await supabase.from("ads").insert(adData);

      if (error) {
        toast({ title: "Failed to create ad", variant: "destructive" });
      } else {
        toast({ title: "Ad created" });
        fetchAds();
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedAd) return;

    const { error } = await supabase.from("ads").delete().eq("id", selectedAd.id);

    if (error) {
      toast({ title: "Failed to delete ad", variant: "destructive" });
    } else {
      toast({ title: "Ad deleted" });
      fetchAds();
    }
    setDeleteDialogOpen(false);
    setSelectedAd(null);
  };

  const toggleActive = async (ad: Ad) => {
    const { error } = await supabase
      .from("ads")
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);

    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      fetchAds();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monetization</h1>
            <p className="text-muted-foreground">Manage ads, embed codes, and site-wide announcements</p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
          <Tabs defaultValue="ads" className="w-full">
          <TabsList>
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ad Management
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Embed Code Generator
            </TabsTrigger>
            <TabsTrigger value="announcement" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Announcement Bar
            </TabsTrigger>
          </TabsList>

          {/* Ad Management Tab */}
          <TabsContent value="ads" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" /> Add Ad
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Ads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ads.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Ads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {ads.filter((a) => a.is_active).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Placements Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(ads.map((a) => a.placement)).size}
                  </div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : ads.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No ads configured yet.</p>
                  <Button className="mt-4" onClick={openCreateDialog}>
                    Create Your First Ad
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ads.map((ad) => (
                      <TableRow key={ad.id}>
                        <TableCell className="font-medium">{ad.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {PLACEMENTS.find((p) => p.value === ad.placement)?.label || ad.placement}
                          </Badge>
                        </TableCell>
                        <TableCell>{ad.priority}</TableCell>
                        <TableCell>
                          <Switch
                            checked={ad.is_active}
                            onCheckedChange={() => toggleActive(ad)}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ad.start_date || ad.end_date ? (
                            <>
                              {ad.start_date && format(new Date(ad.start_date), "MMM d")}
                              {ad.start_date && ad.end_date && " - "}
                              {ad.end_date && format(new Date(ad.end_date), "MMM d")}
                            </>
                          ) : (
                            "Always"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(ad)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAd(ad);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Embed Code Generator Tab */}
          <TabsContent value="embed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Embed Code Generator
                </CardTitle>
                <CardDescription>Generate embed code for custom image ads with redirect links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image Upload Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <Label className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Ad Image
                  </Label>
                  <div className="flex gap-4">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="cursor-pointer"
                    />
                    {uploadingImage && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Upload JPG, PNG, GIF, or WebP (max 5MB). Image dimensions will be auto-detected.</p>
                  
                  {/* Uploaded Images Gallery */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Previously Uploaded Images</Label>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
                        {uploadedImages.map((img) => (
                          <div 
                            key={img.name} 
                            className={`relative group cursor-pointer border rounded overflow-hidden ${embedImageUrl === img.url ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => setEmbedImageUrl(img.url)}
                          >
                            <img src={img.url} alt={img.name} className="w-full h-16 object-cover" />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.name); }}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="embed_image_url">Image URL</Label>
                      <Input
                        id="embed_image_url"
                        placeholder="https://example.com/ad-image.jpg"
                        value={embedImageUrl}
                        onChange={(e) => setEmbedImageUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">URL of the ad image to display (auto-filled when uploading)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embed_redirect_url">Redirect URL</Label>
                      <Input
                        id="embed_redirect_url"
                        placeholder="https://example.com/landing-page"
                        value={embedRedirectUrl}
                        onChange={(e) => setEmbedRedirectUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">URL to redirect when the ad is clicked</p>
                    </div>
                    
                    {/* Preset Ad Sizes Dropdown */}
                    <div className="space-y-2">
                      <Label>Preset Ad Sizes</Label>
                      <Select
                        onValueChange={(value) => {
                          if (value !== "custom") {
                            const [w, h] = value.split("x");
                            setEmbedWidth(w);
                            setEmbedHeight(h);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a preset size or use custom" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="300x250">Medium Rectangle (300×250)</SelectItem>
                          <SelectItem value="336x280">Large Rectangle (336×280)</SelectItem>
                          <SelectItem value="728x90">Leaderboard (728×90)</SelectItem>
                          <SelectItem value="970x90">Large Leaderboard (970×90)</SelectItem>
                          <SelectItem value="160x600">Wide Skyscraper (160×600)</SelectItem>
                          <SelectItem value="300x600">Half Page (300×600)</SelectItem>
                          <SelectItem value="320x50">Mobile Banner (320×50)</SelectItem>
                          <SelectItem value="320x100">Large Mobile Banner (320×100)</SelectItem>
                          <SelectItem value="468x60">Banner (468×60)</SelectItem>
                          <SelectItem value="250x250">Square (250×250)</SelectItem>
                          <SelectItem value="200x200">Small Square (200×200)</SelectItem>
                          <SelectItem value="120x600">Skyscraper (120×600)</SelectItem>
                          <SelectItem value="custom">Custom Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="embed_width">Width (px)</Label>
                        <Input
                          id="embed_width"
                          type="number"
                          placeholder="300"
                          value={embedWidth}
                          onChange={(e) => setEmbedWidth(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="embed_height">Height (px)</Label>
                        <Input
                          id="embed_height"
                          type="number"
                          placeholder="250"
                          value={embedHeight}
                          onChange={(e) => setEmbedHeight(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embed_alt_text">Alt Text</Label>
                      <Input
                        id="embed_alt_text"
                        placeholder="Advertisement"
                        value={embedAltText}
                        onChange={(e) => setEmbedAltText(e.target.value)}
                      />
                    </div>
                    <Button onClick={generateEmbedCode} className="w-full">
                      <Code className="mr-2 h-4 w-4" />
                      Generate Embed Code
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Generated Embed Code</Label>
                      <Textarea
                        placeholder="Generated embed code will appear here..."
                        rows={10}
                        value={generatedEmbedCode}
                        readOnly
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (generatedEmbedCode) {
                          navigator.clipboard.writeText(generatedEmbedCode);
                          toast({ title: "Copied!", description: "Embed code copied to clipboard" });
                        }
                      }}
                      disabled={!generatedEmbedCode}
                      className="w-full"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Embed Code
                    </Button>
                    {embedImageUrl && (
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="border rounded-lg p-4 bg-muted/20 flex items-center justify-center min-h-[150px]">
                          {embedRedirectUrl ? (
                            <a href={embedRedirectUrl} target="_blank" rel="noopener noreferrer">
                              <img 
                                src={embedImageUrl} 
                                alt={embedAltText || "Advertisement"} 
                                style={{ maxWidth: `${embedWidth}px`, maxHeight: `${embedHeight}px`, objectFit: "contain" }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23ddd' width='200' height='150'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage Error%3C/text%3E%3C/svg%3E";
                                }}
                              />
                            </a>
                          ) : (
                            <img 
                              src={embedImageUrl} 
                              alt={embedAltText || "Advertisement"} 
                              style={{ maxWidth: `${embedWidth}px`, maxHeight: `${embedHeight}px`, objectFit: "contain" }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23ddd' width='200' height='150'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage Error%3C/text%3E%3C/svg%3E";
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Announcement Bar Tab */}
          <TabsContent value="announcement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Announcement Bar Settings
                </CardTitle>
                <CardDescription>Configure the sticky announcement bar that appears at the top of your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label>Enable Announcement Bar</Label>
                    <p className="text-sm text-muted-foreground">Show announcement bar to all visitors</p>
                  </div>
                  <Switch
                    checked={announcementEnabled}
                    onCheckedChange={setAnnouncementEnabled}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="announcement-message">Message</Label>
                    <Input
                      id="announcement-message"
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      placeholder="🎉 New courses available! Learn the latest skills today."
                    />
                    <p className="text-xs text-muted-foreground mt-1">Use emojis to make your message stand out</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="announcement-link-text">Link Text (optional)</Label>
                      <Input
                        id="announcement-link-text"
                        value={announcementLinkText}
                        onChange={(e) => setAnnouncementLinkText(e.target.value)}
                        placeholder="Explore now →"
                      />
                    </div>
                    <div>
                      <Label htmlFor="announcement-link-url">Link URL</Label>
                      <Input
                        id="announcement-link-url"
                        value={announcementLinkUrl}
                        onChange={(e) => setAnnouncementLinkUrl(e.target.value)}
                        placeholder="/courses"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="announcement-bg-color">Background Color</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        id="announcement-bg-color"
                        value={announcementBgColor}
                        onChange={(e) => setAnnouncementBgColor(e.target.value)}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={announcementBgColor}
                        onChange={(e) => setAnnouncementBgColor(e.target.value)}
                        placeholder="#22c55e"
                        className="w-32"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Choose a background color for the announcement bar</p>
                  </div>

                  <div>
                    <Label htmlFor="announcement-text-color">Text Color</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="color"
                        id="announcement-text-color"
                        value={announcementTextColor}
                        onChange={(e) => setAnnouncementTextColor(e.target.value)}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={announcementTextColor}
                        onChange={(e) => setAnnouncementTextColor(e.target.value)}
                        placeholder="#ffffff"
                        className="w-32"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Choose a text color for better contrast</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Scheduling (Optional)</Label>
                    <p className="text-xs text-muted-foreground">Set start and end dates to automatically show/hide the announcement</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="announcement-start-date">Start Date</Label>
                        <Input
                          id="announcement-start-date"
                          type="date"
                          value={announcementStartDate}
                          onChange={(e) => setAnnouncementStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="announcement-end-date">End Date</Label>
                        <Input
                          id="announcement-end-date"
                          type="date"
                          value={announcementEndDate}
                          onChange={(e) => setAnnouncementEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Leave empty to show the announcement indefinitely when enabled</p>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Preview</Label>
                    {(() => {
                      const now = new Date();
                      const startDate = announcementStartDate ? new Date(announcementStartDate) : null;
                      const endDate = announcementEndDate ? new Date(announcementEndDate) : null;
                      
                      if (!announcementEnabled) {
                        return (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Disabled
                          </Badge>
                        );
                      }
                      
                      if (endDate && now > endDate) {
                        return (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Expired
                          </Badge>
                        );
                      }
                      
                      if (startDate && now < startDate) {
                        return (
                          <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-600">
                            <CalendarClock className="h-3 w-3" />
                            Upcoming
                          </Badge>
                        );
                      }
                      
                      return (
                        <Badge className="flex items-center gap-1 bg-primary">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div 
                      className="py-2 px-4 text-center text-sm font-medium"
                      style={{ backgroundColor: announcementBgColor, color: announcementTextColor }}
                    >
                      <span>{announcementMessage || "Your announcement message here..."}</span>
                      {announcementLinkText && (
                        <span className="ml-2 underline underline-offset-2 font-semibold">
                          {announcementLinkText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button onClick={saveAnnouncementSettings} disabled={savingAnnouncement}>
                  {savingAnnouncement ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Announcement Settings"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAd ? "Edit Ad" : "Create Ad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ad name"
                />
              </div>
              <div>
                <Label htmlFor="placement">Placement</Label>
                <Select
                  value={formData.placement}
                  onValueChange={(value) => setFormData({ ...formData, placement: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Ad Image
              </Label>
              <div className="flex gap-4 items-center">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAdImageUpload}
                  disabled={adImageUploading}
                  className="cursor-pointer"
                />
                {adImageUploading && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
              </div>
              <Input
                placeholder="Or paste image URL directly..."
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              {formData.image_url && (
                <div className="mt-2">
                  <img 
                    src={formData.image_url} 
                    alt="Ad preview" 
                    className="max-h-32 rounded border object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="redirect_url">Redirect URL (where to go when clicked)</Label>
              <Input
                id="redirect_url"
                value={formData.redirect_url}
                onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                placeholder="https://example.com/landing-page"
              />
            </div>

            <Separator />

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Advanced: Custom HTML/JS Ad Code (optional)
              </summary>
              <div className="mt-3">
                <Textarea
                  id="ad_code"
                  value={formData.ad_code}
                  onChange={(e) => setFormData({ ...formData, ad_code: e.target.value })}
                  placeholder="Paste custom ad code here (overrides image if provided)..."
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </details>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedAd?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminMonetization;
