import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  name: string;
  placement: string;
  ad_label?: string | null;
  ad_code: string | null;
  image_url: string | null;
  redirect_url: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
}

const LABEL_STYLES: Record<string, string> = {
  sponsored: "bg-neutral-900/60 text-neutral-100",
  partner: "bg-blue-600/70 text-white",
  recommended: "bg-emerald-600/70 text-white",
};

function AdLabel({ label }: { label: string }) {
  const cls = LABEL_STYLES[label] ?? "bg-black/50 text-white";
  return (
    <span
      className={`absolute top-2 right-2 z-10 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm ${cls}`}
    >
      {label}
    </span>
  );
}

interface AdPlacementProps {
  placement: string;
  className?: string;
}

function isScheduleActive(ad: Ad): boolean {
  const now = new Date();
  if (ad.start_date && new Date(ad.start_date) > now) return false;
  if (ad.end_date && new Date(ad.end_date) < now) return false;
  return true;
}

export const AdPlacement = ({ placement, className = "" }: AdPlacementProps) => {
  const [ad, setAd] = useState<Ad | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("ads")
      .select("*")
      .eq("placement", placement)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        const active = data.find((a: Ad) => isScheduleActive(a)) ?? null;
        setAd(active);
        setImgLoaded(false);
        setImgError(false);
      });
    return () => { cancelled = true; };
  }, [placement]);

  // Inject ad_code scripts (dangerouslySetInnerHTML skips <script> tags)
  useEffect(() => {
    if (!ad?.ad_code || !codeRef.current) return;
    const container = codeRef.current;
    container.innerHTML = "";
    try {
      const fragment = document.createRange().createContextualFragment(ad.ad_code);
      container.appendChild(fragment);
    } catch {
      container.innerHTML = ad.ad_code;
    }
  }, [ad?.id, ad?.ad_code]);

  if (!ad) return null;

  // Ad code (AdSense / custom HTML)
  if (ad.ad_code) {
    return (
      <div
        ref={codeRef}
        className={`ad-placement overflow-hidden ${className}`}
        data-placement={placement}
      />
    );
  }

  // Image ad
  if (ad.image_url) {
    const inner = (
      <>
        {/* Hidden img — we use it to detect load/error, then show via CSS */}
        <img
          src={ad.image_url}
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
        {/* Placeholder shown while loading or on error */}
        {!imgLoaded && (
          <div className="w-full h-full bg-muted/30" />
        )}
      </>
    );

    // If image definitively failed and there's no redirect, hide entirely
    if (imgError && !ad.redirect_url) return null;

    return (
      <div
        className={`ad-placement relative overflow-hidden ${className}`}
        data-placement={placement}
      >
        {ad.ad_label && <AdLabel label={ad.ad_label} />}
        {ad.redirect_url ? (
          <a
            href={ad.redirect_url}
            target="_blank"
            rel="noopener noreferrer sponsored nofollow"
            className="block w-full h-full"
          >
            {inner}
          </a>
        ) : (
          inner
        )}
      </div>
    );
  }

  return null;
};
