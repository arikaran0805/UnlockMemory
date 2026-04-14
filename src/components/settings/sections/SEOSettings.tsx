import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Search, Share2, Image } from "lucide-react";
import { SettingsCard, SettingsCardHeader, SettingsLabel, SettingsHint, SettingsTitle } from "../SettingsCard";

interface SEOSettingsProps {
  metaTitle: string;
  setMetaTitle: (value: string) => void;
  metaDescription: string;
  setMetaDescription: (value: string) => void;
  ogImage: string;
  setOgImage: (value: string) => void;
  ogTitle: string;
  setOgTitle: (value: string) => void;
  ogDescription: string;
  setOgDescription: (value: string) => void;
  readOnly?: boolean;
}

const SEOSettings = ({
  metaTitle, setMetaTitle, metaDescription, setMetaDescription,
  ogImage, setOgImage, ogTitle, setOgTitle, ogDescription, setOgDescription,
  readOnly = false,
}: SEOSettingsProps) => {
  return (
    <div className="space-y-6">
      <SettingsTitle title="SEO Settings" description="Optimize your site for search engines" />

      <SettingsCard>
        <SettingsCardHeader icon={Search} title="Meta Tags" description="Default meta tags for search engines" />
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <SettingsLabel>Meta Title</SettingsLabel>
            <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="UnlockMemory - Learn Through Visual Stories" maxLength={60} disabled={readOnly} className="admin-input" />
            <div className="flex justify-between">
              <SettingsHint>Appears in search results and browser tabs</SettingsHint>
              <SettingsHint>{metaTitle.length}/60</SettingsHint>
            </div>
          </div>

          <div className="space-y-2">
            <SettingsLabel>Meta Description</SettingsLabel>
            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="A brief description of your site for search results..." rows={3} maxLength={160} disabled={readOnly}
              className="admin-input resize-none" />
            <div className="flex justify-between">
              <SettingsHint>Description shown in search results</SettingsHint>
              <SettingsHint>{metaDescription.length}/160</SettingsHint>
            </div>
          </div>

          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ backgroundColor: "var(--admin-card-header)" }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--admin-label)" }}>Allow Search Indexing</p>
              <SettingsHint>Let search engines index your site</SettingsHint>
            </div>
            <Switch defaultChecked={true} disabled={readOnly} />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <SettingsCardHeader icon={Share2} title="Open Graph (Social Sharing)" description="How your site appears when shared on social media" />
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <SettingsLabel>OG Title</SettingsLabel>
            <Input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)}
              placeholder="Title when shared on social media" disabled={readOnly} className="admin-input" />
          </div>
          <div className="space-y-2">
            <SettingsLabel>OG Description</SettingsLabel>
            <Textarea value={ogDescription} onChange={(e) => setOgDescription(e.target.value)}
              placeholder="Description when shared on social media" rows={2} disabled={readOnly} className="admin-input resize-none" />
          </div>
          <div className="space-y-2">
            <SettingsLabel>Default OG Image</SettingsLabel>
            <Input value={ogImage} onChange={(e) => setOgImage(e.target.value)}
              placeholder="https://example.com/og-image.jpg" disabled={readOnly} className="admin-input" />
            <SettingsHint>Recommended: 1200x630px</SettingsHint>
          </div>

          {/* OG Preview */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--admin-card-border)" }}>
            <div className="aspect-[1.91/1] flex items-center justify-center" style={{ backgroundColor: "var(--admin-card-header)" }}>
              {ogImage ? (
                <img src={ogImage} alt="OG Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Image className="h-12 w-12 mx-auto mb-2" style={{ color: "var(--admin-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--admin-label-muted)" }}>No image set</p>
                </div>
              )}
            </div>
            <div className="p-4" style={{ backgroundColor: "var(--admin-card)", borderTop: "1px solid var(--admin-card-border)" }}>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--admin-muted)" }}>unlockmemory.com</p>
              <p className="font-semibold line-clamp-1" style={{ color: "var(--admin-text)" }}>
                {ogTitle || metaTitle || "Your Site Title"}
              </p>
              <p className="text-sm line-clamp-2 mt-1" style={{ color: "var(--admin-muted)" }}>
                {ogDescription || metaDescription || "Your site description will appear here"}
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
};

export default SEOSettings;
