import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Share2, ExternalLink } from "lucide-react";

interface SocialSettingsProps {
  twitterUrl: string;
  setTwitterUrl: (v: string) => void;
  instagramUrl: string;
  setInstagramUrl: (v: string) => void;
  linkedinUrl: string;
  setLinkedinUrl: (v: string) => void;
  youtubeUrl: string;
  setYoutubeUrl: (v: string) => void;
  facebookUrl: string;
  setFacebookUrl: (v: string) => void;
  githubUrl: string;
  setGithubUrl: (v: string) => void;
  readOnly?: boolean;
}

const AdminCard = ({ children }: { children: React.ReactNode }) => (
  <div
    className="rounded-2xl overflow-hidden shadow-sm"
    style={{
      backgroundColor: "var(--admin-card)",
      border: "1px solid var(--admin-card-border)",
    }}
  >
    {children}
  </div>
);

const AdminCardHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div
    className="px-6 py-4"
    style={{
      backgroundColor: "var(--admin-card-header)",
      borderBottom: "1px solid var(--admin-card-border)",
    }}
  >
    <div
      className="flex items-center gap-2 text-base font-semibold"
      style={{ color: "var(--admin-text)" }}
    >
      <Icon className="h-5 w-5" style={{ color: "var(--admin-muted)" }} />
      {title}
    </div>
    <p className="text-sm mt-0.5" style={{ color: "var(--admin-muted)" }}>
      {description}
    </p>
  </div>
);

const AdminLabel = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label
    htmlFor={htmlFor}
    className="text-sm font-medium"
    style={{ color: "var(--admin-label)" }}
  >
    {children}
  </label>
);

const AdminHint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs" style={{ color: "var(--admin-label-muted)" }}>
    {children}
  </p>
);

interface SocialFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  hint?: string;
}

const SocialField = ({ id, label, placeholder, value, onChange, readOnly, hint }: SocialFieldProps) => (
  <div className="space-y-2">
    <AdminLabel htmlFor={id}>{label}</AdminLabel>
    <div className="flex gap-2">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={readOnly}
        className="admin-input flex-1"
      />
      {value && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={() => window.open(value, "_blank", "noopener,noreferrer")}
          title={`Visit ${label}`}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
    </div>
    {hint && <AdminHint>{hint}</AdminHint>}
  </div>
);

const SocialSettings = ({
  twitterUrl,
  setTwitterUrl,
  instagramUrl,
  setInstagramUrl,
  linkedinUrl,
  setLinkedinUrl,
  youtubeUrl,
  setYoutubeUrl,
  facebookUrl,
  setFacebookUrl,
  githubUrl,
  setGithubUrl,
  readOnly = false,
}: SocialSettingsProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: "var(--admin-text)" }}>
          Social Media
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--admin-muted)" }}>
          Configure your social media profile links. These appear in the site footer.
        </p>
      </div>

      <AdminCard>
        <AdminCardHeader
          icon={Share2}
          title="Social Profiles"
          description="Enter full URLs including https://"
        />
        <div className="p-6 space-y-5">
          <SocialField
            id="linkedinUrl"
            label="LinkedIn"
            placeholder="https://linkedin.com/company/unlockmemory"
            value={linkedinUrl}
            onChange={setLinkedinUrl}
            readOnly={readOnly}
          />
          <SocialField
            id="instagramUrl"
            label="Instagram"
            placeholder="https://instagram.com/unlockmemory"
            value={instagramUrl}
            onChange={setInstagramUrl}
            readOnly={readOnly}
          />
          <SocialField
            id="twitterUrl"
            label="Twitter / X"
            placeholder="https://twitter.com/unlockmemory"
            value={twitterUrl}
            onChange={setTwitterUrl}
            readOnly={readOnly}
          />
          <SocialField
            id="youtubeUrl"
            label="YouTube"
            placeholder="https://youtube.com/@unlockmemory"
            value={youtubeUrl}
            onChange={setYoutubeUrl}
            readOnly={readOnly}
          />
          <SocialField
            id="facebookUrl"
            label="Facebook"
            placeholder="https://facebook.com/unlockmemory"
            value={facebookUrl}
            onChange={setFacebookUrl}
            readOnly={readOnly}
          />
          <SocialField
            id="githubUrl"
            label="GitHub"
            placeholder="https://github.com/unlockmemory"
            value={githubUrl}
            onChange={setGithubUrl}
            readOnly={readOnly}
          />
        </div>
      </AdminCard>
    </div>
  );
};

export default SocialSettings;
