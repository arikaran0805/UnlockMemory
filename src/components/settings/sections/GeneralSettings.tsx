import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Globe, Clock, Languages, Moon } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";

interface GeneralSettingsProps {
  siteName: string;
  setSiteName: (value: string) => void;
  siteDescription: string;
  setSiteDescription: (value: string) => void;
  siteUrl: string;
  setSiteUrl: (value: string) => void;
  readOnly?: boolean;
}

const timezones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
];

const GeneralSettings = ({
  siteName,
  setSiteName,
  siteDescription,
  setSiteDescription,
  siteUrl,
  setSiteUrl,
  readOnly = false,
}: GeneralSettingsProps) => {
  const { isDark, toggle } = useDarkMode();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0F2A1D]">General Settings</h2>
        <p className="text-sm text-[#1E1E1E]/60 mt-1">
          Configure your site's basic information
        </p>
      </div>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Globe className="h-5 w-5 text-[#1E4D3A]" />
            Site Information
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Basic details about your platform
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="siteName" className="text-[#1E1E1E]">Site Name</Label>
            <Input
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="UnlockMemory"
              disabled={readOnly}
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteDescription" className="text-[#1E1E1E]">Site Description</Label>
            <Textarea
              id="siteDescription"
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="A brief description of your platform..."
              rows={3}
              disabled={readOnly}
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20 resize-none"
            />
            <p className="text-xs text-[#1E1E1E]/40">
              This description appears in search results and social shares
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteUrl" className="text-[#1E1E1E]">Site URL</Label>
            <Input
              id="siteUrl"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://unlockmemory.com"
              disabled={readOnly}
              className="border-[#E8EBE7] focus:border-[#1E4D3A] focus:ring-[#1E4D3A]/20"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Clock className="h-5 w-5 text-[#1E4D3A]" />
            Regional Settings
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Timezone and language preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#1E1E1E]">Timezone</Label>
              <Select defaultValue="UTC" disabled={readOnly}>
                <SelectTrigger className="border-[#E8EBE7] focus:ring-[#1E4D3A]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1E1E1E]">Language</Label>
              <Select defaultValue="en" disabled={readOnly}>
                <SelectTrigger className="border-[#E8EBE7] focus:ring-[#1E4D3A]/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-[#E8EBE7] shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#FAFBF9] border-b border-[#E8EBE7]">
          <CardTitle className="flex items-center gap-2 text-[#0F2A1D]">
            <Moon className="h-5 w-5 text-[#1E4D3A]" />
            Appearance
          </CardTitle>
          <CardDescription className="text-[#1E1E1E]/50">
            Customize the admin interface appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="dark-mode-toggle" className="text-[#1E1E1E] font-medium cursor-pointer">
                Dark Mode
              </Label>
              <p className="text-xs text-[#1E1E1E]/40">
                Switch between light and dark appearance for the admin experience
              </p>
            </div>
            <Switch
              id="dark-mode-toggle"
              checked={isDark}
              onCheckedChange={toggle}
              aria-label="Toggle dark mode"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettings;
