import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Twitter, Facebook, Instagram, Linkedin, Youtube, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <footer className="bg-background border-t border-border">
      <div className="container px-4">
        {/* Main Footer */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-foreground flex items-center justify-center">
                <span className="text-2xl">📖</span>
              </div>
              <span className="text-2xl font-black text-foreground">{siteName}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed max-w-sm">
              {siteDescription}
            </p>

            {/* Social Links */}
            <div className="flex gap-2">
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialMediaClick("twitter")}
                  className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialMediaClick("facebook")}
                  className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialMediaClick("instagram")}
                  className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialMediaClick("linkedin")}
                  className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialMediaClick("youtube")}
                  className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {socialLinks.github && (
                <a
                  href={socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackSocialMediaClick("github")}
                  className="w-10 h-10 border border-border flex items-center justify-center hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-2">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Courses
            </h4>
            <ul className="space-y-4">
              {footerCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/course/${cat.slug}`}
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Company
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/about" className="text-foreground hover:text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-foreground hover:text-primary transition-colors">
                  All Courses
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Legal
            </h4>
            <ul className="space-y-4">
              <li>
                <Link to="/privacy" className="text-foreground hover:text-primary transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-foreground hover:text-primary transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter teaser */}
          <div className="md:col-span-2">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Stay Updated
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Get notified about new courses and features.
            </p>
            <Link to="/contact">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none border-foreground text-foreground hover:bg-foreground hover:text-background"
              >
                Subscribe
              </Button>
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground font-mono">
            Crafted with passion for learning
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
