import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, User } from "lucide-react";
import Layout from "@/components/Layout";

const freeFeatures = [
  { text: "Access to free courses", included: true },
  { text: "Basic practice problems", included: true },
  { text: "Community support", included: true },
  { text: "Progress tracking", included: true },
  { text: "Certificate of completion", included: false },
  { text: "Premium courses", included: false },
  { text: "Ad-free experience", included: false },
  { text: "Priority support", included: false },
  { text: "Career roadmaps", included: false },
  { text: "Offline access", included: false },
];

const proFeatures = [
  { text: "Access to all courses", included: true },
  { text: "All practice problems", included: true },
  { text: "Community support", included: true },
  { text: "Progress tracking", included: true },
  { text: "Certificate of completion", included: true },
  { text: "Premium courses", included: true },
  { text: "Ad-free experience", included: true },
  { text: "Priority support", included: true },
  { text: "Career roadmaps", included: true },
  { text: "Offline access", included: true },
];

const ChoosePlan = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Choose Your Learning Path
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start learning for free or unlock everything with Pro.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className="relative border-border/60 shadow-md flex flex-col">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Free Learner</CardTitle>
              <CardDescription className="text-base">
                Get started with the essentials
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {freeFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  {f.included ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                    {f.text}
                  </span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="pt-6">
              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => navigate("/")}
              >
                Continue Free
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-primary/40 shadow-lg ring-2 ring-primary/20 flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Recommended
              </span>
            </div>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Pro Learner</CardTitle>
              <CardDescription className="text-base">
                Unlock your full potential
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {proFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{f.text}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="pt-6">
              <Button
                className="w-full h-12 text-base"
                onClick={() => navigate("/careers")}
              >
                Continue as Pro
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ChoosePlan;
