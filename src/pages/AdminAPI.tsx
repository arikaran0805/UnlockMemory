import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Webhook, Key, Copy, Eye, EyeOff, DollarSign, LayoutGrid, FileCode, Monitor, Smartphone, CheckCircle, AlertCircle, Save, RefreshCw } from "lucide-react";

interface WebhookType {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string | null;
  created_at: string;
}

interface APIIntegration {
  id: string;
  name: string;
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

interface AdSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  description: string | null;
}

interface AdPreviewBoxProps {
  label: string;
  slot: string;
  client: string;
  type: "horizontal" | "sidebar" | "mobile";
  thirdParty?: string;
}

const AdPreviewBox = ({ label, slot, client, type, thirdParty }: AdPreviewBoxProps) => {
  const isConfigured = (slot && slot.length > 0) || (thirdParty && thirdParty.length > 0);
  const hasClient = client && client.length > 0;
  const isThirdParty = thirdParty && thirdParty.length > 0;
  
  const heightClass = type === "sidebar" ? "h-[250px]" : type === "mobile" ? "h-[100px]" : "h-[90px]";
  
  return (
    <div 
      className={`${heightClass} border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 transition-colors ${
        isConfigured && hasClient 
          ? "border-primary/50 bg-primary/5" 
          : isThirdParty 
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-muted-foreground/30 bg-muted/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isConfigured && hasClient ? (
          <CheckCircle className="h-4 w-4 text-primary" />
        ) : isThirdParty ? (
          <CheckCircle className="h-4 w-4 text-amber-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {isThirdParty ? (
        <span className="text-xs text-amber-600">Third-party code</span>
      ) : isConfigured && hasClient ? (
        <span className="text-xs text-primary">Slot: {slot.substring(0, 10)}...</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {!hasClient ? "Missing Ad Client" : "No slot configured"}
        </span>
      )}
    </div>
  );
};

const WEBHOOK_EVENTS = [
  { value: "post.created", label: "Post Created" },
  { value: "post.updated", label: "Post Updated" },
  { value: "post.published", label: "Post Published" },
  { value: "post.deleted", label: "Post Deleted" },
  { value: "comment.created", label: "Comment Created" },
  { value: "comment.approved", label: "Comment Approved" },
  { value: "user.registered", label: "User Registered" },
];

const AdminAPI = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [integrations, setIntegrations] = useState<APIIntegration[]>([]);

  // Webhook dialog state
  const [webhookDialog, setWebhookDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
    secret: "",
  });

  // Integration dialog state
  const [integrationDialog, setIntegrationDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<APIIntegration | null>(null);
  const [integrationForm, setIntegrationForm] = useState({
    name: "",
    provider: "",
    apiKey: "",
  });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ type: "webhook" | "integration"; id: string } | null>(null);

  // Show secret state
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Ad settings state
  const [adSettings, setAdSettings] = useState<AdSetting[]>([]);
  const [savingAds, setSavingAds] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast({ title: "Access denied", description: "Admin access required", variant: "destructive" });
      navigate("/");
      return;
    }

    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchWebhooks(), fetchIntegrations(), fetchAdSettings()]);
    setLoading(false);
  };

  const fetchWebhooks = async () => {
    const { data, error } = await supabase.from("webhooks").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching webhooks:", error);
    } else {
      setWebhooks(data || []);
    }
  };

  const fetchIntegrations = async () => {
    const { data, error } = await supabase.from("api_integrations").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching integrations:", error);
    } else {
      setIntegrations((data || []).map(item => ({
        ...item,
        config: (item.config || {}) as Record<string, unknown>
      })));
    }
  };

  const fetchAdSettings = async () => {
    const { data, error } = await supabase.from("ad_settings").select("*").order("setting_key");
    if (error) {
      console.error("Error fetching ad settings:", error);
    } else {
      setAdSettings(data || []);
    }
  };

  const handleAdSettingChange = (key: string, value: string) => {
    setAdSettings(prev =>
      prev.map(s =>
        s.setting_key === key ? { ...s, setting_value: value } : s
      )
    );
  };

  const getAdSettingValue = (key: string) => {
    return adSettings.find(s => s.setting_key === key)?.setting_value || "";
  };

  const getAdSetting = (key: string) => {
    return adSettings.find(s => s.setting_key === key);
  };

  const saveAdSettings = async () => {
    setSavingAds(true);
    try {
      for (const setting of adSettings) {
        const { error } = await supabase
          .from("ad_settings")
          .update({ setting_value: setting.setting_value })
          .eq("setting_key", setting.setting_key);
        if (error) throw error;
      }
      toast({ title: "Success", description: "Ad settings saved successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingAds(false);
    }
  };

  const openWebhookDialog = (webhook?: WebhookType) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setWebhookForm({
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret || "",
      });
    } else {
      setEditingWebhook(null);
      setWebhookForm({ name: "", url: "", events: [], secret: "" });
    }
    setWebhookDialog(true);
  };

  const saveWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) {
      toast({ title: "Error", description: "Name and URL are required", variant: "destructive" });
      return;
    }

    const payload = {
      name: webhookForm.name,
      url: webhookForm.url,
      events: webhookForm.events,
      secret: webhookForm.secret || null,
    };

    let error;
    if (editingWebhook) {
      ({ error } = await supabase.from("webhooks").update(payload).eq("id", editingWebhook.id));
    } else {
      ({ error } = await supabase.from("webhooks").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save webhook", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Webhook ${editingWebhook ? "updated" : "created"}` });
      setWebhookDialog(false);
      fetchWebhooks();
    }
  };

  const toggleWebhook = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("webhooks").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update webhook", variant: "destructive" });
    } else {
      fetchWebhooks();
    }
  };

  const openIntegrationDialog = (integration?: APIIntegration) => {
    if (integration) {
      setEditingIntegration(integration);
      setIntegrationForm({
        name: integration.name,
        provider: integration.provider,
        apiKey: (integration.config as Record<string, string>)?.api_key || "",
      });
    } else {
      setEditingIntegration(null);
      setIntegrationForm({ name: "", provider: "", apiKey: "" });
    }
    setIntegrationDialog(true);
  };

  const saveIntegration = async () => {
    if (!integrationForm.name || !integrationForm.provider) {
      toast({ title: "Error", description: "Name and provider are required", variant: "destructive" });
      return;
    }

    const payload = {
      name: integrationForm.name,
      provider: integrationForm.provider,
      config: { api_key: integrationForm.apiKey },
    };

    let error;
    if (editingIntegration) {
      ({ error } = await supabase.from("api_integrations").update(payload).eq("id", editingIntegration.id));
    } else {
      ({ error } = await supabase.from("api_integrations").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: "Failed to save integration", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Integration ${editingIntegration ? "updated" : "created"}` });
      setIntegrationDialog(false);
      fetchIntegrations();
    }
  };

  const toggleIntegration = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("api_integrations").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update integration", variant: "destructive" });
    } else {
      fetchIntegrations();
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    const table = deleteDialog.type === "webhook" ? "webhooks" : "api_integrations";
    const { error } = await supabase.from(table).delete().eq("id", deleteDialog.id);

    if (error) {
      toast({ title: "Error", description: `Failed to delete ${deleteDialog.type}`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${deleteDialog.type === "webhook" ? "Webhook" : "Integration"} deleted` });
      deleteDialog.type === "webhook" ? fetchWebhooks() : fetchIntegrations();
    }
    setDeleteDialog(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="p-6">Loading...</div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">API & Integrations</h1>
            <p className="text-muted-foreground">Manage webhooks and external API integrations</p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">

        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="integrations">External APIs</TabsTrigger>
            <TabsTrigger value="ads">Ad Settings</TabsTrigger>
          </TabsList>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhooks
                  </CardTitle>
                  <CardDescription>Send real-time notifications to external services</CardDescription>
                </div>
                <Button onClick={() => openWebhookDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </CardHeader>
              <CardContent>
                {webhooks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No webhooks configured</p>
                ) : (
                  <div className="space-y-4">
                    {webhooks.map((webhook) => (
                      <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{webhook.name}</span>
                            <Badge variant={webhook.is_active ? "default" : "secondary"}>
                              {webhook.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-md">{webhook.url}</p>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.is_active}
                            onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => openWebhookDialog(webhook)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: "webhook", id: webhook.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* External APIs Tab */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    External API Integrations
                  </CardTitle>
                  <CardDescription>Connect third-party services</CardDescription>
                </div>
                <Button onClick={() => openIntegrationDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </CardHeader>
              <CardContent>
                {integrations.filter(i => i.provider !== "google_adsense").length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No integrations configured</p>
                ) : (
                  <div className="space-y-4">
                    {integrations.filter(i => i.provider !== "google_adsense").map((integration) => (
                      <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{integration.name}</span>
                            <Badge variant={integration.is_active ? "default" : "secondary"}>
                              {integration.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{integration.provider}</p>
                          {(integration.config as Record<string, string>)?.api_key && (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {showSecrets[integration.id] 
                                  ? (integration.config as Record<string, string>).api_key 
                                  : "••••••••••••"}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => setShowSecrets({ ...showSecrets, [integration.id]: !showSecrets[integration.id] })}
                              >
                                {showSecrets[integration.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => copyToClipboard((integration.config as Record<string, string>).api_key)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.is_active}
                            onCheckedChange={(checked) => toggleIntegration(integration.id, checked)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => openIntegrationDialog(integration)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: "integration", id: integration.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ad Settings Tab */}
          <TabsContent value="ads" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Ad Settings</h2>
                <p className="text-sm text-muted-foreground">Configure Google AdSense and third-party ad integration</p>
              </div>
              <Button onClick={saveAdSettings} disabled={savingAds}>
                {savingAds ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
            </div>

            {/* Google AdSense Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Google AdSense Configuration
                </CardTitle>
                <CardDescription>Enter your Google AdSense Publisher ID to enable ads across your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="google_ad_client">Publisher ID (Ad Client)</Label>
                  <Input
                    id="google_ad_client"
                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                    value={getAdSettingValue("google_ad_client")}
                    onChange={(e) => handleAdSettingChange("google_ad_client", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{getAdSetting("google_ad_client")?.description}</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_ads" className="text-base">Enable Auto Ads</Label>
                    <p className="text-sm text-muted-foreground">Let Google automatically place and optimize ads on your site</p>
                  </div>
                  <Switch
                    id="auto_ads"
                    checked={getAdSettingValue("auto_ads") === "true"}
                    onCheckedChange={(checked) => handleAdSettingChange("auto_ads", checked.toString())}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_preview_ads" className="text-base">Show Preview Ads</Label>
                    <p className="text-sm text-muted-foreground">Display placeholder ads for testing when no real ads are configured</p>
                  </div>
                  <Switch
                    id="show_preview_ads"
                    checked={getAdSettingValue("show_preview_ads") === "true"}
                    onCheckedChange={(checked) => handleAdSettingChange("show_preview_ads", checked.toString())}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="ad_redirect_url">Ad Redirect URL (Optional)</Label>
                  <Input
                    id="ad_redirect_url"
                    placeholder="https://example.com/ad-landing"
                    value={getAdSettingValue("ad_redirect_url")}
                    onChange={(e) => handleAdSettingChange("ad_redirect_url", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Default redirect URL for custom image ads</p>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar Ad Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  Sidebar Ad Slots
                </CardTitle>
                <CardDescription>Configure ad slot IDs for sidebar positions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_top_slot">Sidebar Top Slot</Label>
                    <Input id="sidebar_top_slot" placeholder="1234567890" value={getAdSettingValue("sidebar_top_slot")} onChange={(e) => handleAdSettingChange("sidebar_top_slot", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Top sidebar ad position</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_middle_slot">Sidebar Middle Slot</Label>
                    <Input id="sidebar_middle_slot" placeholder="2345678901" value={getAdSettingValue("sidebar_middle_slot")} onChange={(e) => handleAdSettingChange("sidebar_middle_slot", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Middle sidebar ad position</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sidebar_bottom_slot">Sidebar Bottom Slot</Label>
                    <Input id="sidebar_bottom_slot" placeholder="3456789012" value={getAdSettingValue("sidebar_bottom_slot")} onChange={(e) => handleAdSettingChange("sidebar_bottom_slot", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Bottom sidebar ad position</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* In-Content Ad Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                  In-Content Ad Slots
                </CardTitle>
                <CardDescription>Configure ad slot IDs for in-content positions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="in_content_top_slot">In-Content Top Slot</Label>
                    <Input id="in_content_top_slot" placeholder="4567890123" value={getAdSettingValue("in_content_top_slot")} onChange={(e) => handleAdSettingChange("in_content_top_slot", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Below title/header</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="in_content_middle_slot">In-Content Middle Slot</Label>
                    <Input id="in_content_middle_slot" placeholder="5678901234" value={getAdSettingValue("in_content_middle_slot")} onChange={(e) => handleAdSettingChange("in_content_middle_slot", e.target.value)} />
                    <p className="text-xs text-muted-foreground">After 3rd paragraph</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="in_content_bottom_slot">In-Content Bottom Slot</Label>
                    <Input id="in_content_bottom_slot" placeholder="6789012345" value={getAdSettingValue("in_content_bottom_slot")} onChange={(e) => handleAdSettingChange("in_content_bottom_slot", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Before comments/related</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Third-Party Ad Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-primary" />
                  Third-Party Ad Code
                </CardTitle>
                <CardDescription>Optional: Custom ad code for the sidebar middle position (overrides AdSense)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="third_party_sidebar_code">Custom Ad Code (HTML/Script)</Label>
                  <Textarea
                    id="third_party_sidebar_code"
                    placeholder="<script>...</script> or <div>...</div>"
                    rows={6}
                    value={getAdSettingValue("third_party_sidebar_code")}
                    onChange={(e) => handleAdSettingChange("third_party_sidebar_code", e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">If provided, this code will be used instead of AdSense for the sidebar middle position</p>
                </div>
              </CardContent>
            </Card>

            {/* Ad Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Ad Preview
                </CardTitle>
                <CardDescription>Preview how your ads will appear on your site (mock placeholders)</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="desktop" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="desktop" className="flex items-center gap-2"><Monitor className="h-4 w-4" />Desktop</TabsTrigger>
                    <TabsTrigger value="mobile" className="flex items-center gap-2"><Smartphone className="h-4 w-4" />Mobile</TabsTrigger>
                  </TabsList>
                  <TabsContent value="desktop">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="col-span-2 space-y-4">
                        <div className="bg-muted/30 rounded-lg p-4 border">
                          <h3 className="font-semibold text-lg mb-2">Article Title</h3>
                          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-muted rounded w-full"></div>
                        </div>
                        <AdPreviewBox label="In-Content Top" slot={getAdSettingValue("in_content_top_slot")} client={getAdSettingValue("google_ad_client")} type="horizontal" />
                        <div className="bg-muted/30 rounded-lg p-4 border">
                          <div className="h-4 bg-muted rounded w-full mb-2"></div>
                          <div className="h-4 bg-muted rounded w-5/6"></div>
                        </div>
                        <AdPreviewBox label="In-Content Middle" slot={getAdSettingValue("in_content_middle_slot")} client={getAdSettingValue("google_ad_client")} type="horizontal" />
                        <div className="bg-muted/30 rounded-lg p-4 border">
                          <div className="h-4 bg-muted rounded w-full mb-2"></div>
                          <div className="h-4 bg-muted rounded w-4/5"></div>
                        </div>
                        <AdPreviewBox label="In-Content Bottom" slot={getAdSettingValue("in_content_bottom_slot")} client={getAdSettingValue("google_ad_client")} type="horizontal" />
                      </div>
                      <div className="space-y-4">
                        <AdPreviewBox label="Sidebar Top" slot={getAdSettingValue("sidebar_top_slot")} client={getAdSettingValue("google_ad_client")} type="sidebar" />
                        <AdPreviewBox label="Sidebar Middle" slot={getAdSettingValue("sidebar_middle_slot")} client={getAdSettingValue("google_ad_client")} type="sidebar" thirdParty={getAdSettingValue("third_party_sidebar_code")} />
                        <AdPreviewBox label="Sidebar Bottom" slot={getAdSettingValue("sidebar_bottom_slot")} client={getAdSettingValue("google_ad_client")} type="sidebar" />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="mobile">
                    <div className="max-w-sm mx-auto space-y-4">
                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <h3 className="font-semibold text-lg mb-2">Article Title</h3>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                      </div>
                      <AdPreviewBox label="In-Content Top" slot={getAdSettingValue("in_content_top_slot")} client={getAdSettingValue("google_ad_client")} type="mobile" />
                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <div className="h-4 bg-muted rounded w-full mb-2"></div>
                        <div className="h-4 bg-muted rounded w-5/6"></div>
                      </div>
                      <AdPreviewBox label="In-Content Middle" slot={getAdSettingValue("in_content_middle_slot")} client={getAdSettingValue("google_ad_client")} type="mobile" />
                      <div className="bg-muted/30 rounded-lg p-4 border">
                        <div className="h-4 bg-muted rounded w-full"></div>
                      </div>
                      <AdPreviewBox label="In-Content Bottom" slot={getAdSettingValue("in_content_bottom_slot")} client={getAdSettingValue("google_ad_client")} type="mobile" />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </div>

      {/* Webhook Dialog */}
      <Dialog open={webhookDialog} onOpenChange={setWebhookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
            <DialogDescription>Configure webhook endpoint and events</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={webhookForm.name}
                onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                placeholder="My Webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <Label>Secret (optional)</Label>
              <Input
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                placeholder="webhook_secret_key"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.value}
                      checked={webhookForm.events.includes(event.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setWebhookForm({ ...webhookForm, events: [...webhookForm.events, event.value] });
                        } else {
                          setWebhookForm({ ...webhookForm, events: webhookForm.events.filter(e => e !== event.value) });
                        }
                      }}
                    />
                    <Label htmlFor={event.value} className="text-sm">{event.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookDialog(false)}>Cancel</Button>
            <Button onClick={saveWebhook}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integration Dialog */}
      <Dialog open={integrationDialog} onOpenChange={setIntegrationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIntegration ? "Edit Integration" : "Add Integration"}</DialogTitle>
            <DialogDescription>Configure external API integration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={integrationForm.name}
                onChange={(e) => setIntegrationForm({ ...integrationForm, name: e.target.value })}
                placeholder="My Integration"
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={integrationForm.provider}
                onValueChange={(value) => setIntegrationForm({ ...integrationForm, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mailchimp">Mailchimp</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="zapier">Zapier</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="analytics">Google Analytics</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={integrationForm.apiKey}
                onChange={(e) => setIntegrationForm({ ...integrationForm, apiKey: e.target.value })}
                placeholder="Enter API key"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntegrationDialog(false)}>Cancel</Button>
            <Button onClick={saveIntegration}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog?.type === "webhook" ? "Webhook" : "Integration"}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </>
);
};

export default AdminAPI;
