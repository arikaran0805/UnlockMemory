import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, Twitter, Linkedin } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const TOPICS = [
  { value: "course_question", label: "Course Question" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "billing", label: "Billing" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  topic: z.string().min(1, "Please select a topic"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormValues = z.infer<typeof schema>;

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    const { error } = await supabase.from("contact_submissions").insert({
      name: data.name,
      email: data.email,
      topic: data.topic,
      message: data.message,
    });
    if (error) {
      setSubmitError("Something went wrong. Please try again or email us directly.");
    } else {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    reset();
    setSubmitted(false);
    setSubmitError(null);
  };

  return (
    <Layout>
      <SEOHead
        title="Contact Us - Get In Touch"
        description="Have a question or want to work together? Contact the UnlockMemory team — we reply within 24 hours."
        keywords="contact, get in touch, email, support, help"
      />

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">

        {/* ── Left Panel ─────────────────────────────────────────────── */}
        <div className="w-full lg:w-1/2 bg-primary lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] flex flex-col justify-between px-10 py-16 lg:px-16">

          {/* Top */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary-foreground/60 uppercase mb-6">
              Contact Us
            </p>
            <h1 className="text-5xl font-bold text-primary-foreground leading-tight">
              Let's talk.
            </h1>
            <ul className="mt-8 space-y-3">
              {[
                "Course or curriculum questions",
                "Technical issues & account help",
                "Partnerships & collaborations",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-primary-foreground/80 text-base">
                  <span className="text-primary-foreground/40 mt-0.5 select-none">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Middle — contact info */}
          <div className="mt-14">
            <p className="text-xs font-semibold tracking-widest text-primary-foreground/50 uppercase mb-3">
              Reach Us Directly
            </p>
            <a
              href="mailto:hello@unlockmemory.com"
              className="text-primary-foreground text-lg font-medium hover:underline underline-offset-4 transition-all"
            >
              hello@unlockmemory.com
            </a>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-primary-foreground/10 text-primary-foreground/80 text-xs px-3 py-1.5 rounded-full">
              ⚡ We reply within 24 hours
            </div>
          </div>

          {/* Bottom — social */}
          <div className="mt-auto pt-14 flex items-center gap-4">
            <a
              href="https://twitter.com/unlockmemory"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="https://linkedin.com/company/unlockmemory"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────────────────── */}
        <div className="w-full lg:w-1/2 bg-background px-8 py-16 lg:px-16 lg:py-24 flex items-start lg:items-center">
          <div className="w-full max-w-lg mx-auto">

            {submitted ? (
              /* Success state */
              <div className="text-center py-12">
                <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-5" />
                <h2 className="text-2xl font-bold text-foreground mb-2">Message sent!</h2>
                <p className="text-muted-foreground text-sm mb-8">
                  We'll get back to you within 24 hours.
                </p>
                <Button variant="outline" onClick={handleReset}>
                  Send another message
                </Button>
              </div>
            ) : (
              /* Form */
              <>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  Send us a message
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  Fill in the form and we'll get back to you shortly.
                </p>

                {submitError && (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Name
                    </label>
                    <Input
                      {...register("name")}
                      placeholder="Your name"
                      className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-destructive text-xs mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Email
                    </label>
                    <Input
                      {...register("email")}
                      type="email"
                      placeholder="you@example.com"
                      className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Topic
                    </label>
                    <Select onValueChange={(val) => setValue("topic", val, { shouldValidate: true })}>
                      <SelectTrigger className={errors.topic ? "border-destructive" : ""}>
                        <SelectValue placeholder="What's this about?" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOPICS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.topic && (
                      <p className="text-destructive text-xs mt-1">{errors.topic.message}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Message
                    </label>
                    <Textarea
                      {...register("message")}
                      placeholder="Tell us more about your inquiry…"
                      rows={5}
                      className={errors.message ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.message && (
                      <p className="text-destructive text-xs mt-1">{errors.message.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Contact;
