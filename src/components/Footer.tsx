import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Github, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";

const Footer = () => {
  const [siteName, setSiteName] = useState("UnlockMemory");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteDescription, setSiteDescription] = useState("Learn through visuals that stick.");
  const [footerCategories, setFooterCategories] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState({
    twitter: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    github: "",
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
      .limit(5);

    if (!error && data) {
      setFooterCategories(data);
    }
  };

  const socialEntries = [
    { key: "twitter", url: socialLinks.twitter, Icon: Twitter },
    { key: "facebook", url: socialLinks.facebook, Icon: Facebook },
    { key: "instagram", url: socialLinks.instagram, Icon: Instagram },
    { key: "linkedin", url: socialLinks.linkedin, Icon: Linkedin },
    { key: "youtube", url: socialLinks.youtube, Icon: Youtube },
    { key: "github", url: socialLinks.github, Icon: Github },
  ].filter(e => e.url);

  return (
    <footer className="relative border-t border-border/40 bg-muted/30">
      {/* Main Footer */}
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12 pt-16 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-y-12 gap-x-8">

          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 group transition-transform duration-200 ease-out hover:scale-[1.03]"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-9 w-auto" />
              ) : (
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                  <span className="text-base font-black text-primary-foreground">{siteName.charAt(0)}</span>
                </div>
              )}
              <span className="text-lg tracking-[0.01em] text-foreground">
                <span className="font-medium">Unlock</span>
                <span className="font-semibold">Memory</span>
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-muted-foreground/70 max-w-[280px]">
              {siteDescription}
            </p>

            {/* Social Links */}
            {socialEntries.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                {socialEntries.map(({ key, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackSocialMediaClick(key)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/8 transition-all duration-200"
                  >
                    <Icon className="h-[15px] w-[15px]" strokeWidth={1.6} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Courses Column */}
          <div className="lg:col-span-2">
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 mb-4">
              Courses
            </h4>
            <ul className="space-y-2.5">
              {footerCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/course/${cat.slug}`}
                    className="text-[14px] text-foreground/75 hover:text-primary transition-all duration-200 hover:translate-x-0.5 inline-block"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div className="lg:col-span-2">
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              {[
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
                { to: "/courses", label: "All Courses" },
              ].map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[14px] text-foreground/75 hover:text-primary transition-all duration-200 hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div className="lg:col-span-2">
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {[
                { to: "/privacy", label: "Privacy Policy" },
                { to: "/terms", label: "Terms of Service" },
              ].map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[14px] text-foreground/75 hover:text-primary transition-all duration-200 hover:translate-x-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter / CTA Column */}
          <div className="sm:col-span-2 lg:col-span-2">
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 mb-4">
              Stay Updated
            </h4>
            <p className="text-[13px] leading-relaxed text-muted-foreground/60 mb-4">
              Get notified about new courses, features, and learning tips.
            </p>
            <Link to="/contact">
              <button className="group inline-flex items-center gap-2 text-[13px] font-medium text-foreground/80 px-4 py-2 rounded-lg border border-border/60 hover:border-primary/40 hover:text-primary hover:bg-primary/4 transition-all duration-200">
                Subscribe
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.8} />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/30">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[12px] text-muted-foreground/50">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <p className="text-[12px] text-muted-foreground/40">
            Crafted with passion for learning
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
