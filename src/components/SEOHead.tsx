import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
}

const SEOHead = ({
  title,
  description,
  keywords,
  ogImage,
  ogTitle,
  ogDescription,
}: SEOHeadProps) => {
  const [seoSettings, setSeoSettings] = useState({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: "",
    og_title: "",
    og_description: "",
    twitter_card_type: "summary_large_image",
    twitter_site: "",
  });

  useEffect(() => {
    fetchSEOSettings();
  }, []);

  const fetchSEOSettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("meta_title, meta_description, meta_keywords, og_image, og_title, og_description, twitter_card_type, twitter_site")
      .limit(1)
      .maybeSingle();

    if (data) {
      setSeoSettings(data);
    }
  };

  useEffect(() => {
    const finalTitle = title || seoSettings.meta_title || "UnlockMemory";
    const finalDescription = description || seoSettings.meta_description || "Inspiring stories and ideas for curious minds";
    const finalKeywords = keywords || seoSettings.meta_keywords || "";
    const finalOgImage = ogImage || seoSettings.og_image || "";
    const finalOgTitle = ogTitle || seoSettings.og_title || finalTitle;
    const finalOgDescription = ogDescription || seoSettings.og_description || finalDescription;

    // Set document title
    document.title = finalTitle;

    // Update or create meta tags
    updateMetaTag("description", finalDescription);
    if (finalKeywords) updateMetaTag("keywords", finalKeywords);

    // Open Graph tags
    updateMetaTag("og:title", finalOgTitle, "property");
    updateMetaTag("og:description", finalOgDescription, "property");
    updateMetaTag("og:type", "website", "property");
    if (finalOgImage) updateMetaTag("og:image", finalOgImage, "property");
    updateMetaTag("og:url", window.location.href, "property");

    // Twitter Card tags
    updateMetaTag("twitter:card", seoSettings.twitter_card_type || "summary_large_image");
    updateMetaTag("twitter:title", finalOgTitle);
    updateMetaTag("twitter:description", finalOgDescription);
    if (finalOgImage) updateMetaTag("twitter:image", finalOgImage);
    if (seoSettings.twitter_site) updateMetaTag("twitter:site", seoSettings.twitter_site);
  }, [title, description, keywords, ogImage, ogTitle, ogDescription, seoSettings]);

  const updateMetaTag = (name: string, content: string, attribute: string = "name") => {
    if (!content) return;

    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    
    if (element) {
      element.setAttribute("content", content);
    } else {
      element = document.createElement("meta");
      element.setAttribute(attribute, name);
      element.setAttribute("content", content);
      document.head.appendChild(element);
    }
  };

  return null;
};

export default SEOHead;
