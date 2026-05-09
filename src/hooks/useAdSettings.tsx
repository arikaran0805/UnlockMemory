import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdSettings {
  googleAdClient: string;
  sidebarTopSlot: string;
  sidebarMiddleSlot: string;
  sidebarBottomSlot: string;
  inContentSlot: string;
  thirdPartySidebarCode: string;
  showPreviewAds: boolean;
  adRedirectUrl: string;
}

const defaultSettings: AdSettings = {
  googleAdClient: "",
  sidebarTopSlot: "",
  sidebarMiddleSlot: "",
  sidebarBottomSlot: "",
  inContentSlot: "",
  thirdPartySidebarCode: "",
  showPreviewAds: false,
  adRedirectUrl: "",
};

export const useAdSettings = () => {
  const [settings, setSettings] = useState<AdSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("ad_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      const settingsMap: AdSettings = { ...defaultSettings };
      
      data?.forEach((item) => {
        switch (item.setting_key) {
          case "google_ad_client":
            settingsMap.googleAdClient = item.setting_value || "";
            break;
          case "sidebar_top_slot":
            settingsMap.sidebarTopSlot = item.setting_value || "";
            break;
          case "sidebar_middle_slot":
            settingsMap.sidebarMiddleSlot = item.setting_value || "";
            break;
          case "sidebar_bottom_slot":
            settingsMap.sidebarBottomSlot = item.setting_value || "";
            break;
          case "in_content_slot":
            settingsMap.inContentSlot = item.setting_value || "";
            break;
          case "third_party_sidebar_code":
            settingsMap.thirdPartySidebarCode = item.setting_value || "";
            break;
          case "show_preview_ads":
            settingsMap.showPreviewAds = item.setting_value === "true";
            break;
          case "ad_redirect_url":
            settingsMap.adRedirectUrl = item.setting_value || "";
            break;
        }
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error("Error fetching ad settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, refetch: fetchSettings };
};

export default useAdSettings;