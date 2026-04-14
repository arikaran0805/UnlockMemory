import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Cog, Zap, Database, FlaskConical, AlertTriangle, RefreshCw } from "lucide-react";
import { SettingsCard, SettingsCardHeader, SettingsTitle } from "../SettingsCard";

const SettingsRow = ({ label, hint, defaultChecked = false, accent = false }:
  { label: string; hint: string; defaultChecked?: boolean; accent?: boolean }) => (
  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "var(--admin-card-header)" }}>
    <div>
      <p className="text-sm font-medium" style={{ color: "var(--admin-label)" }}>{label}</p>
      <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>{hint}</p>
    </div>
    <Switch defaultChecked={defaultChecked} className={accent ? "data-[state=checked]:bg-amber-500" : "data-[state=checked]:bg-[#0F6E56]"} />
  </div>
);

const FlagRow = ({ label, hint, badge }: { label: string; hint: string; badge: string }) => (
  <div className="flex items-center justify-between p-4 rounded-xl" style={{ border: "1px solid var(--admin-card-border)" }}>
    <div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium" style={{ color: "var(--admin-label)" }}>{label}</p>
        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">{badge}</Badge>
      </div>
      <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>{hint}</p>
    </div>
    <Switch className="data-[state=checked]:bg-[#0F6E56]" />
  </div>
);

const AdvancedSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheOptions, setCacheOptions] = useState({ queryCache: true, localStorage: false, sessionStorage: false });

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const cleared: string[] = [];
      if (cacheOptions.queryCache) { queryClient.clear(); cleared.push("Query Cache"); }
      if (cacheOptions.localStorage) { localStorage.clear(); cleared.push("Local Storage"); }
      if (cacheOptions.sessionStorage) { sessionStorage.clear(); cleared.push("Session Storage"); }
      toast({ title: "Cache Cleared", description: `Cleared: ${cleared.join(", ")}` });
    } catch {
      toast({ title: "Error", description: "Failed to clear cache", variant: "destructive" });
    } finally {
      setClearingCache(false);
    }
  };

  const CacheOption = ({ id, label, hint, key: k }: { id: string; label: string; hint: string; key: keyof typeof cacheOptions }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--admin-card-header)" }}>
      <Checkbox id={id} checked={cacheOptions[k]} onCheckedChange={(v) => setCacheOptions((p) => ({ ...p, [k]: v as boolean }))} />
      <div>
        <label htmlFor={id} className="text-sm font-medium cursor-pointer" style={{ color: "var(--admin-label)" }}>{label}</label>
        <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>{hint}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <SettingsTitle title="Advanced Settings" description="System-level configuration and experimental features" />

      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: "rgba(201,162,77,0.08)", border: "1px solid rgba(201,162,77,0.25)" }}>
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>Advanced Settings</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--admin-muted)" }}>
            Changes here may affect system performance and stability. Proceed with caution.
          </p>
        </div>
      </div>

      {/* Performance */}
      <SettingsCard>
        <SettingsCardHeader icon={Zap} title="Performance" description="Optimize system performance" />
        <div className="p-6 space-y-4">
          <SettingsRow label="Enable Query Caching" hint="Cache database queries for faster response" defaultChecked={true} />
          <SettingsRow label="Enable Image Optimization" hint="Automatically compress and resize images" defaultChecked={true} />
          <SettingsRow label="Lazy Loading" hint="Load images and content as needed" defaultChecked={true} />
        </div>
      </SettingsCard>

      {/* Cache Management */}
      <SettingsCard>
        <SettingsCardHeader icon={Database} title="Cache Management" description="Clear cached data to refresh content" />
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <CacheOption id="queryCache" label="Query Cache" hint="API responses and database queries" k="queryCache" />
            <CacheOption id="localStorage" label="Local Storage" hint="May reset user preferences" k="localStorage" />
            <CacheOption id="sessionStorage" label="Session Storage" hint="May require re-login" k="sessionStorage" />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={!Object.values(cacheOptions).some(Boolean) || clearingCache} className="admin-input border">
                <RefreshCw className={`h-4 w-4 mr-2 ${clearingCache ? "animate-spin" : ""}`} />
                {clearingCache ? "Clearing..." : "Clear Selected Cache"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Cache?</AlertDialogTitle>
                <AlertDialogDescription>This will clear the selected cache types. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCache} className="bg-[#0F6E56] hover:bg-[#0a5a45]">Clear Cache</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SettingsCard>

      {/* Feature Flags */}
      <SettingsCard>
        <SettingsCardHeader icon={FlaskConical} title="Feature Flags" description="Enable or disable experimental features" />
        <div className="p-6 space-y-4">
          <FlagRow label="AI Content Suggestions" hint="AI-powered content recommendations" badge="Beta" />
          <FlagRow label="Advanced Analytics" hint="Enhanced analytics dashboard" badge="Experimental" />
          <FlagRow label="Real-time Collaboration" hint="Multiple editors on the same content" badge="Alpha" />
        </div>
      </SettingsCard>

      {/* Experimental */}
      <SettingsCard>
        <SettingsCardHeader icon={Cog} title="Experimental Toggles" description="Unstable features — use at your own risk" />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-dashed"
            style={{ borderColor: "rgba(201,162,77,0.30)", backgroundColor: "rgba(201,162,77,0.06)" }}>
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--admin-text)" }}>Warning: Experimental Features</p>
              <p className="text-xs mt-1" style={{ color: "var(--admin-muted)" }}>
                These features are still in development and may cause unexpected behavior. Enable only if you understand the risks.
              </p>
            </div>
          </div>
          <div className="opacity-75">
            <SettingsRow label="Debug Mode" hint="Show detailed error information" accent />
          </div>
          <div className="opacity-75">
            <SettingsRow label="Developer Console" hint="Enable in-app developer tools" accent />
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};

export default AdvancedSettings;
