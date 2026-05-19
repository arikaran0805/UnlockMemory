import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import ContentRenderer from "@/components/ContentRenderer";
import UMLoader from "@/components/UMLoader";

interface PageData {
  title: string;
  content: string;
  updated_at: string;
}

interface DynamicPageProps {
  /** Slug of the page row in the `pages` table (e.g. "privacy", "terms") */
  slug: string;
  /** Fallback title shown while loading or when no DB record exists */
  fallbackTitle: string;
  /** Fallback body rendered when no published page row exists for this slug */
  fallbackContent: React.ReactNode;
  seo: {
    title: string;
    description: string;
    keywords?: string;
  };
}

/**
 * Renders a page from the admin `pages` table using the same ContentRenderer
 * (and matching styles) as CourseDetail. Falls back to static JSX when the
 * DB row is missing so the route is never broken.
 */
const DynamicPage = ({ slug, fallbackTitle, fallbackContent, seo }: DynamicPageProps) => {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("pages")
        .select("title, content, updated_at")
        .eq("slug", slug)
        .maybeSingle();

      setPage(data ?? null);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  return (
    <Layout>
      <SEOHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
      />

      {loading ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <UMLoader size={48} dark label="Loading…" />
        </div>
      ) : page ? (
        <div className="mx-auto w-full max-w-[720px] px-4 py-16">
          <ContentRenderer htmlContent={page.content} variant="article" />
          <p className="mt-12 text-sm text-muted-foreground border-t border-border pt-6">
            Last updated:{" "}
            {new Date(page.updated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      ) : (
        /* No published DB row — render the static fallback */
        <div className="container px-4 py-16 max-w-[720px] mx-auto">
          <h1 className="text-4xl font-bold mb-10 text-foreground">{fallbackTitle}</h1>
          {fallbackContent}
        </div>
      )}
    </Layout>
  );
};

export default DynamicPage;
