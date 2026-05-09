import AdPlaceholder from "./AdPlaceholder";

interface InContentAdProps {
  googleAdClient?: string;
  googleAdSlot?: string;
}

/**
 * InContentAd — one ad injected at the midpoint of canvas lesson content.
 *
 * Renders nothing when credentials are missing or invalid (AdPlaceholder
 * collapses silently). In dev/preview mode AdPlaceholder shows the dashed
 * "Ad Slot Preview" placeholder so layout is visible without real credentials.
 */
const InContentAd = ({ googleAdClient, googleAdSlot }: InContentAdProps) => {
  return (
    <div className="w-full my-10 overflow-hidden rounded-xl border border-border/40 bg-muted/5">
      <AdPlaceholder
        adType="in-content"
        googleAdClient={googleAdClient}
        googleAdSlot={googleAdSlot}
        className="w-full min-h-[120px]"
      />
    </div>
  );
};

export default InContentAd;
