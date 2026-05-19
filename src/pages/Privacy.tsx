import DynamicPage from "@/components/DynamicPage";

const Privacy = () => (
  <DynamicPage
    slug="privacy-policy"
    fallbackTitle="Privacy Policy"
    seo={{
      title: "Privacy Policy - How We Protect Your Data",
      description:
        "Learn how UnlockMemory collects, uses, and protects your personal information. Read our comprehensive Privacy Policy to understand your data rights.",
      keywords: "privacy policy, data protection, personal information, privacy rights, GDPR",
    }}
    fallbackContent={
      <p className="text-muted-foreground">
        Privacy policy content coming soon.
      </p>
    }
  />
);

export default Privacy;
