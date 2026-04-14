import { useEffect } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Mail, MapPin, Phone } from "lucide-react";

const Contact = () => {
  useEffect(() => {
    document.title = "UnlockMemory - Contact Us";
  }, []);

  return (
    <Layout>
      <SEOHead 
        title="Contact Us - Get In Touch"
        description="Have a question or want to work together? Contact UnlockMemory team through email, phone, or our contact form. We'd love to hear from you."
        keywords="contact, get in touch, email, support, help"
      />

      <div className="container px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
            <p className="text-lg text-muted-foreground">
              Have a question or want to work together? We'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info Cards */}
            <div className="space-y-4">
              <Card className="p-6 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-card">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <p className="text-sm text-muted-foreground">hello@unlockmemory.com</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-card">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Phone</h3>
                    <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-card">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Office</h3>
                    <p className="text-sm text-muted-foreground">San Francisco, CA 94102</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="lg:col-span-2 p-8 border-2 border-primary/20 shadow-elegant">
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">First Name</label>
                    <Input placeholder="John" className="border-2 border-primary/20 focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Last Name</label>
                    <Input placeholder="Doe" className="border-2 border-primary/20 focus:border-primary/50" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    className="border-2 border-primary/20 focus:border-primary/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input
                    placeholder="How can we help?"
                    className="border-2 border-primary/20 focus:border-primary/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea
                    placeholder="Tell us more about your inquiry..."
                    rows={6}
                    className="border-2 border-primary/20 focus:border-primary/50"
                  />
                </div>

                <Button size="lg" className="w-full bg-gradient-primary shadow-elegant hover:shadow-glow">
                  Send Message
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
