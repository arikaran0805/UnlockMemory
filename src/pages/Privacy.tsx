import { useEffect } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";

const Privacy = () => {
  useEffect(() => {
    document.title = "Privacy Policy - UnlockMemory";
  }, []);

  return (
    <Layout>
      <SEOHead 
        title="Privacy Policy - How We Protect Your Data"
        description="Learn how UnlockMemory collects, uses, and protects your personal information. Read our comprehensive Privacy Policy to understand your data rights."
        keywords="privacy policy, data protection, personal information, privacy rights, GDPR"
      />
      
      <div className="container px-4 py-16 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
        
        <Card className="mb-8">
          <CardContent className="pt-6 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect several types of information from and about users of our website, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Personal information such as name, email address, and other contact details when you register or contact us</li>
                <li>Usage data including how you access and use our website, your IP address, browser type, and device information</li>
                <li>Cookies and similar tracking technologies to track activity and hold certain information</li>
                <li>Content you post, upload, or share on the website</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect about you for various purposes, including to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide, operate, and maintain our website</li>
                <li>Improve, personalize, and expand our website</li>
                <li>Understand and analyze how you use our website</li>
                <li>Develop new products, services, features, and functionality</li>
                <li>Communicate with you for customer service, updates, and promotional purposes</li>
                <li>Process your transactions and manage your account</li>
                <li>Send you emails and notifications</li>
                <li>Find and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Sharing Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may share your information in the following situations:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>With service providers who help us operate our website and provide services to you</li>
                <li>For business transfers in connection with any merger, sale, or acquisition of our business</li>
                <li>With your consent or at your direction</li>
                <li>To comply with legal obligations, protect our rights, or respond to legal requests</li>
                <li>In aggregated or anonymized form that cannot reasonably be used to identify you</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar tracking technologies to track activity on our website and store certain information. 
                Cookies are files with a small amount of data that may include an anonymous unique identifier. You can instruct your 
                browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you 
                may not be able to use some portions of our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                The security of your data is important to us. We strive to use commercially acceptable means to protect your personal 
                information. However, remember that no method of transmission over the internet or method of electronic storage is 100% 
                secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee 
                its absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Your Data Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>The right to access and receive a copy of your personal information</li>
                <li>The right to rectify or update inaccurate personal information</li>
                <li>The right to erase your personal information in certain circumstances</li>
                <li>The right to restrict or object to processing of your personal information</li>
                <li>The right to data portability</li>
                <li>The right to withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our website is not intended for children under the age of 13. We do not knowingly collect personally identifiable 
                information from children under 13. If you are a parent or guardian and you are aware that your child has provided us 
                with personal information, please contact us so we can take necessary action.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Third-Party Links</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our website may contain links to third-party websites or services that are not owned or controlled by us. We have no 
                control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites 
                or services. We encourage you to review the privacy policy of every site you visit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy 
                on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any 
                changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us through our contact page or email us at the 
                address provided on our website.
              </p>
            </section>

            <div className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Privacy;
