import DynamicPage from "@/components/DynamicPage";

const Terms = () => (
  <DynamicPage
    slug="terms"
    fallbackTitle="Terms of Service"
    seo={{
      title: "Terms of Service - Legal Agreement",
      description:
        "Read UnlockMemory's Terms of Service. Understand the legal agreement between you and UnlockMemory regarding the use of our platform and services.",
      keywords: "terms of service, legal agreement, terms and conditions, user agreement",
    }}
    fallbackContent={
      <p className="text-muted-foreground">
        Terms of service content coming soon.
      </p>
    }
  />
);

export default Terms;
