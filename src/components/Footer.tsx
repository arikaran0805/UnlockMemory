import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Github, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";

const Footer = () => {
  const [siteName, setSiteName] = useState("UnlockMemory");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteDescription, setSiteDescription] = useState("Learn through visuals that stick.");
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState({
    twitter: "", facebook: "", instagram: "", linkedin: "", youtube: "", github: "",
  });

  useEffect(() => {
    fetchSiteSettings();
    fetchFooterCategories();
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
      .limit(6);
    if (!error && data) setFooterCategories(data);
  };

  const socialEntries = [
    { key: "twitter",   url: socialLinks.twitter,   Icon: Twitter   },
    { key: "facebook",  url: socialLinks.facebook,  Icon: Facebook  },
    { key: "instagram", url: socialLinks.instagram, Icon: Instagram },
    { key: "linkedin",  url: socialLinks.linkedin,  Icon: Linkedin  },
    { key: "youtube",   url: socialLinks.youtube,   Icon: Youtube   },
    { key: "github",    url: socialLinks.github,    Icon: Github    },
  ].filter(e => e.url);

  return (
    <footer className="border-t border-border/50 bg-background">

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 lg:px-12 pt-16 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-y-12 gap-x-10">

          {/* Brand */}
          <div className="space-y-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.02]"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
              ) : (
                <img src="/unlockMemory_icon.svg" alt={siteName} className="h-8 w-auto" />
              )}
              <span className="text-[15px] tracking-[-0.01em] text-foreground/90 group-hover:text-foreground transition-colors">
                <span className="font-medium">Unlock</span>
                <span className="font-bold">Memory</span>
              </span>
            </Link>

            <p className="text-[13.5px] leading-relaxed text-muted-foreground/70 max-w-[260px]">
              {siteDescription}
            </p>

            {/* Social icons */}
            {socialEntries.length > 0 && (
              <div className="flex items-center gap-1 pt-1">
                {socialEntries.map(({ key, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackSocialMediaClick(key)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/8 transition-all duration-150"
                    title={key}
                  >
                    <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Courses */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/45 mb-5">
              Courses
            </p>
            <ul className="space-y-3">
              {footerCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/course/${cat.slug}`}
                    className="text-[13.5px] text-foreground/65 hover:text-primary transition-colors duration-150"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-primary/80 hover:text-primary transition-colors duration-150 mt-1"
                >
                  View all <ArrowUpRight className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/45 mb-5">
              Company
            </p>
            <ul className="space-y-3">
              {[
                { to: "/about",   label: "About Us"    },
                { to: "/contact", label: "Contact"     },
                { to: "/courses", label: "All Courses" },
              ].map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[13.5px] text-foreground/65 hover:text-primary transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/45 mb-5">
              Legal
            </p>
            <ul className="space-y-3">
              {[
                { to: "/privacy", label: "Privacy Policy"   },
                { to: "/terms",   label: "Terms of Service" },
              ].map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[13.5px] text-foreground/65 hover:text-primary transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div className="border-t border-border/40">
        <div className="container mx-auto px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[12px] text-muted-foreground/45">
            © {new Date().getFullYear()} UnlockMemory. All rights reserved.
          </p>
          <p className="text-[12px] text-muted-foreground/35">
            Crafted with passion for learning
          </p>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
