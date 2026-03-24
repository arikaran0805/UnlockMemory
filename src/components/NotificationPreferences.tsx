import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, Mail, CheckCircle, XCircle, MessageSquare, FileText, Users, Trash2, Flag, Power } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import UMLoader from "@/components/UMLoader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferencesProps {
  userId: string | null;
  isAdmin?: boolean;
  isModerator?: boolean;
}

export const NotificationPreferences = ({ userId, isAdmin, isModerator }: NotificationPreferencesProps) => {
  const { preferences, loading, saving, updatePreference, refetch } = useNotificationPreferences(userId);
  const { toast } = useToast();
  const [allModeratorEnabled, setAllModeratorEnabled] = useState(true);
  const [savingAll, setSavingAll] = useState(false);

  // Sync master toggle with individual preferences
  useEffect(() => {
    if (preferences && (isModerator || isAdmin)) {
      const allEnabled = 
        preferences.content_approved &&
        preferences.content_rejected &&
        preferences.changes_requested &&
        preferences.annotations;
      setAllModeratorEnabled(allEnabled);
    }
  }, [preferences, isModerator, isAdmin]);

  const handleToggleAllModerator = async (enabled: boolean) => {
    if (!userId) return;
    
    setSavingAll(true);
    setAllModeratorEnabled(enabled);
    
    try {
      const { data: existingData } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const updates = {
        content_approved: enabled,
        content_rejected: enabled,
        changes_requested: enabled,
        annotations: enabled,
      };

      if (existingData) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(updates)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: userId,
            content_submissions: true,
            reports: true,
            new_users: true,
            delete_requests: true,
            ...updates,
            email_notifications: false,
          });
        if (error) throw error;
      }

      await refetch();
      
      toast({
        title: enabled ? "Notifications enabled" : "Notifications disabled",
        description: enabled 
          ? "You will now receive all moderator notifications" 
          : "You will no longer receive moderator notifications",
      });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      setAllModeratorEnabled(!enabled);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <UMLoader size={44} label="Unlocking memory…" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  const PreferenceRow = ({ 
    icon: Icon, 
    label, 
    description, 
    checked, 
    onCheckedChange,
    disabled = false 
  }: { 
    icon: typeof Bell;
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-sm font-medium cursor-pointer" htmlFor={label}>
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {saving && <UMLoader size={16} />}
        <Switch
          id={label}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled || saving}
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Notification Preferences</CardTitle>
        </div>
        <CardDescription>Choose which notifications you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Admin-specific preferences */}
        {isAdmin && (
          <>
            <div className="pb-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Admin Notifications</h4>
            </div>
            
            <PreferenceRow
              icon={FileText}
              label="Content Submissions"
              description="When moderators submit content for approval"
              checked={preferences.content_submissions}
              onCheckedChange={(checked) => updatePreference('content_submissions', checked)}
            />
            
            <PreferenceRow
              icon={Flag}
              label="Reports"
              description="When users report content or issues"
              checked={preferences.reports}
              onCheckedChange={(checked) => updatePreference('reports', checked)}
            />
            
            <PreferenceRow
              icon={Users}
              label="New Users"
              description="When new users sign up"
              checked={preferences.new_users}
              onCheckedChange={(checked) => updatePreference('new_users', checked)}
            />
            
            <PreferenceRow
              icon={Trash2}
              label="Delete Requests"
              description="When users request content deletion"
              checked={preferences.delete_requests}
              onCheckedChange={(checked) => updatePreference('delete_requests', checked)}
            />
            
            <Separator className="my-4" />
          </>
        )}

        {/* Moderator-specific preferences */}
        {(isModerator || isAdmin) && (
          <>
            <div className="pb-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {isAdmin ? 'Moderator Notifications' : 'Your Notifications'}
              </h4>
            </div>
            
            {/* Master Toggle for Moderators */}
            <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/50 border mb-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                  <Power className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium cursor-pointer" htmlFor="all-moderator-notifications">
                    All Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">Enable or disable all notifications at once</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savingAll && <UMLoader size={16} />}
                <Switch
                  id="all-moderator-notifications"
                  checked={allModeratorEnabled}
                  onCheckedChange={handleToggleAllModerator}
                  disabled={savingAll || saving}
                />
              </div>
            </div>
            
            <PreferenceRow
              icon={CheckCircle}
              label="Content Approved"
              description="When your content is approved by an admin"
              checked={preferences.content_approved}
              onCheckedChange={(checked) => updatePreference('content_approved', checked)}
            />
            
            <PreferenceRow
              icon={XCircle}
              label="Content Rejected"
              description="When your content is rejected by an admin"
              checked={preferences.content_rejected}
              onCheckedChange={(checked) => updatePreference('content_rejected', checked)}
            />
            
            <PreferenceRow
              icon={MessageSquare}
              label="Changes Requested"
              description="When an admin requests changes on your content"
              checked={preferences.changes_requested}
              onCheckedChange={(checked) => updatePreference('changes_requested', checked)}
            />
            
            <PreferenceRow
              icon={MessageSquare}
              label="Annotations"
              description="When an admin adds annotations to your content"
              checked={preferences.annotations}
              onCheckedChange={(checked) => updatePreference('annotations', checked)}
            />
            
            <Separator className="my-4" />
          </>
        )}

        {/* General preferences */}
        <div className="pb-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">General</h4>
        </div>
        
        <PreferenceRow
          icon={Mail}
          label="Email Notifications"
          description="Receive notifications via email (coming soon)"
          checked={preferences.email_notifications}
          onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
          disabled={true}
        />
        
        <div className="pt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <BellOff className="h-3.5 w-3.5" />
          <span>Disabled notifications will not appear in your notification bell</span>
        </div>
      </CardContent>
    </Card>
  );
};
