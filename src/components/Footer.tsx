import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Instagram, Linkedin, Youtube, ArrowUpRight, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";

// X (formerly Twitter) official logo path
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Per-platform brand hover colors
const BRAND: Record<string, { bg: string; glow: string }> = {
  linkedin: { bg: "#0A66C2", glow: "0 4px 16px rgba(10,102,194,0.42)" },
  instagram: { bg: "#E1306C", glow: "0 4px 16px rgba(225,48,108,0.40)" },
  twitter: { bg: "#000000", glow: "0 4px 16px rgba(0,0,0,0.28)" },
  youtube: { bg: "#FF0000", glow: "0 4px 16px rgba(255,0,0,0.40)" },
};

const SocialBtn = ({
  platform,
  Icon,
  url,
  onTrack,
}: {
  platform: string;
  Icon: React.ElementType;
  url: string;
  onTrack: () => void;
}) => {
  const [over, setOver] = useState(false);
  const brand = BRAND[platform];
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onTrack}
      aria-label={platform}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => setOver(false)}
      style={{
        backgroundColor: over ? brand.bg : "white",
        color: over ? "white" : "hsl(var(--foreground))",
        boxShadow: over
          ? brand.glow
          : "0 1px 3px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.06)",
        transform: over ? "translateY(-2px)" : "translateY(0)",
        transition: "background-color 0.18s ease-out, color 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.18s ease-out",
      }}
      className="flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer"
    >
      {platform === "twitter"
        ? <XIcon />
        : <Icon className="h-[18px] w-[18px]" strokeWidth={platform === "instagram" ? 2.25 : 1.75} />
      }
    </a>
  );
};

const Footer = () => {
  const [siteName, setSiteName] = useState("UnlockMemory");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteDescription, setSiteDescription] = useState("Learn through visuals that stick.");
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [footerCareers, setFooterCareers] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState({
    twitter: "", facebook: "", instagram: "", linkedin: "", youtube: "", github: "",
  });

  useEffect(() => {
    fetchSiteSettings();
    fetchFooterCategories();
    fetchFooterCareers();
  }, []);

  const fetchSiteSettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("site_name, site_description, logo_url, twitter_url, facebook_url, instagram_url, linkedin_url, youtube_url, github_url")
      .limit(1)
      .maybeSingle();

    if (data) {
      setSiteName(data.site_name || "UnlockMemory");
      setLogoUrl(data.logo_url || null);
      setSiteDescription(data.site_description || "Learn through visuals that stick.");
      setSocialLinks({
        twitter: data.twitter_url || "",
        facebook: data.facebook_url || "",
        instagram: data.instagram_url || "",
        linkedin: data.linkedin_url || "",
        youtube: data.youtube_url || "",
        github: data.github_url || "",
      });
    }
  };

  const fetchFooterCategories = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("name, slug")
      .order("created_at", { ascending: false })
      .limit(5);
    if (!error && data) setFooterCategories(data);
  };

  const fetchFooterCareers = async () => {
    const { data, error } = await supabase
      .from("careers")
      .select("name, slug")
      .order("created_at", { ascending: false })
      .limit(5);
    if (!error && data) setFooterCareers(data);
  };

  // Always-visible row: LinkedIn · Instagram · X · YouTube
  // Renders as a SocialBtn (linked) when URL is configured, muted static icon otherwise
  const SOCIAL_ROW = [
    { key: "linkedin", Icon: Linkedin, url: socialLinks.linkedin },
    { key: "instagram", Icon: Instagram, url: socialLinks.instagram },
    { key: "twitter", Icon: XIcon, url: socialLinks.twitter },
    { key: "youtube", Icon: Youtube, url: socialLinks.youtube },
  ];

  return (
    <footer className="border-t border-border/60">

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT — tinted background for visual separation from page
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="footer-bg">
        <div className="container mx-auto px-6 lg:px-12 pt-20 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-y-12 gap-x-12">

            {/* ── Brand ─────────────────────────────────────────────────── */}
            {/* Right border on desktop separates identity from navigation */}
            <div className="space-y-6 lg:pr-10 lg:border-r lg:border-border/60">

              {/* Logo + wordmark */}
              <Link to="/" className="inline-flex items-center gap-3 group">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={siteName}
                    className="h-10 w-auto transition-transform duration-200 group-hover:scale-[1.04]"
                  />
                ) : (
                  <img
                    src="/unlockMemory_icon.svg"
                    alt={siteName}
                    className="h-10 w-auto transition-transform duration-200 group-hover:scale-[1.04]"
                  />
                )}
                <span className="text-[20px] tracking-[-0.03em] text-foreground group-hover:text-primary transition-colors duration-200">
                  <span className="font-medium">Unlock</span>
                  <span className="font-bold">Memory</span>
                </span>
              </Link>

              {/* Description */}
              <p className="text-[13.5px] leading-[1.7] text-foreground/70 max-w-[260px]">
                {siteDescription}
              </p>

              {/* Social icons — always visible; linked when URL is configured */}
              <div className="flex items-center justify-between w-full max-w-[260px] pt-1">
                {SOCIAL_ROW.map(({ key, Icon, url }) =>
                  url ? (
                    <SocialBtn
                      key={key}
                      platform={key}
                      Icon={Icon}
                      url={url}
                      onTrack={() => trackSocialMediaClick(key)}
                    />
                  ) : (
                    <span
                      key={key}
                      title={key}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.80)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
                        color: "hsl(var(--foreground))",
                      }}
                      className="flex items-center justify-center w-10 h-10 rounded-xl cursor-default"
                    >
                      {key === "twitter"
                        ? <XIcon />
                        : <Icon className="h-[18px] w-[18px]" strokeWidth={key === "instagram" ? 2.25 : 1.75} />
                      }
                    </span>
                  )
                )}
              </div>
            </div>

            {/* ── Courses ──────────────────────────────────────────────── */}
            <div className="lg:pl-2">
              {/* Accent bar + heading */}
              <div className="mb-5 pb-3 border-b border-border/40">
                <div className="w-4 h-[2px] rounded-full bg-[#22A55D] mb-3" />
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/65">
                  Courses
                </p>
              </div>
              <ul className="space-y-3">
                {footerCategories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      to={`/course/${cat.slug}`}
                      className="block text-[13px] text-foreground/68 hover:text-foreground
                                 hover:translate-x-0.5 transition-all duration-150 leading-snug"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
                <li className="pt-1.5">
                  <Link
                    to="/courses"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold
                               text-[#22A55D] hover:text-[#1a9050] transition-colors duration-150"
                  >
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Careers ──────────────────────────────────────────────── */}
            <div className="lg:pl-2">
              <div className="mb-5 pb-3 border-b border-border/40">
                <div className="w-4 h-[2px] rounded-full bg-[#22A55D] mb-3" />
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/65">
                  Careers
                </p>
              </div>
              <ul className="space-y-3">
                {footerCareers.map((career) => (
                  <li key={career.slug}>
                    <Link
                      to={`/career/${career.slug}`}
                      className="block text-[13px] text-foreground/68 hover:text-foreground
                                 hover:translate-x-0.5 transition-all duration-150 leading-snug"
                    >
                      {career.name}
                    </Link>
                  </li>
                ))}
                <li className="pt-1.5">
                  <Link
                    to="/careers"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold
                               text-[#22A55D] hover:text-[#1a9050] transition-colors duration-150"
                  >
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* ── Company ──────────────────────────────────────────────── */}
            <div className="lg:pl-2">
              <div className="mb-5 pb-3 border-b border-border/40">
                <div className="w-4 h-[2px] rounded-full bg-[#22A55D] mb-3" />
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-foreground/65">
                  Company
                </p>
              </div>
              <ul className="space-y-3">
                {[
                  { to: "/about", label: "About Us" },
                  { to: "/contact", label: "Contact" },
                  { to: "/courses", label: "All Courses" },
                ].map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="block text-[13px] text-foreground/68 hover:text-foreground
                                 hover:translate-x-0.5 transition-all duration-150 leading-snug"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM BAR — white, clearly lighter than the tinted main area above
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-background border-t border-border/50">
        <div className="container mx-auto px-6 lg:px-12 py-4 grid grid-cols-3 items-center gap-4">

          {/* Left — copyright */}
          <p className="text-[11.5px] text-foreground/55 whitespace-nowrap">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>

          {/* Center — tagline */}
          <p className="inline-flex items-center justify-center gap-1.5 text-[11.5px] text-foreground/50">
            Crafted with <Heart className="h-2.5 w-2.5 fill-[#22A55D] text-[#22A55D]" /> for learners
          </p>

          {/* Right — legal */}
          <div className="flex items-center justify-end gap-4">
            <Link
              to="/privacy"
              className="text-[11.5px] text-foreground/55 hover:text-foreground/80 transition-colors duration-150"
            >
              Privacy Policy
            </Link>
            <span className="w-px h-3 bg-border/70" />
            <Link
              to="/terms"
              className="text-[11.5px] text-foreground/55 hover:text-foreground/80 transition-colors duration-150"
            >
              Terms of Service
            </Link>
          </div>

        </div>
      </div>

    </footer>
  );
};

export default Footer;
