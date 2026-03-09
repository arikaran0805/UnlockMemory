import { useNavigate } from "react-router-dom";
import { Check, X, Crown, User } from "lucide-react";
import { motion } from "framer-motion";
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

const cardVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  hover: { y: -6, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const ChoosePlan = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-20">
          {/* Hero */}
          <motion.div
            className="text-center mb-12 sm:mb-16 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Choose Your Learning Path
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Start learning for free or unlock everything with Pro.
            </p>
          </motion.div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-[900px] mx-auto">
            {/* Free Card */}
            <motion.div
              className="relative rounded-2xl border border-border/50 bg-card p-8 md:p-10 flex flex-col shadow-sm cursor-default"
              variants={cardVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ willChange: "transform" }}
            >
              {/* Icon */}
              <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                  Free Learner
                </h2>
                <p className="mt-2 text-muted-foreground text-[0.95rem]">
                  Get started with the essentials
                </p>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-4 mb-10">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {f.included ? (
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <X className="h-3 w-3 text-muted-foreground/40" strokeWidth={3} />
                      </div>
                    )}
                    <span
                      className={`text-[0.9rem] leading-snug ${
                        f.included ? "text-foreground" : "text-muted-foreground/40"
                      }`}
                    >
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate("/")}
                className="w-full h-12 rounded-xl border border-border text-foreground font-medium text-[0.95rem] bg-background hover:bg-accent transition-colors duration-200"
              >
                Continue Free
              </button>
            </motion.div>

            {/* Pro Card */}
            <motion.div
              className="relative rounded-2xl border border-primary/20 bg-card p-8 md:p-10 flex flex-col shadow-md cursor-default"
              variants={cardVariants}
              initial="initial"
              animate="animate"
              whileHover="hover"
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ willChange: "transform" }}
            >
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full tracking-wide">
                  Recommended
                </span>
              </div>

              {/* Icon */}
              <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                  Pro Learner
                </h2>
                <p className="mt-2 text-muted-foreground text-[0.95rem]">
                  Unlock your full potential
                </p>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-4 mb-10">
                {proFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                    </div>
                    <span className="text-[0.9rem] leading-snug text-foreground">
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate("/careers")}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-[0.95rem] hover:bg-primary/90 transition-colors duration-200"
              >
                Continue as Pro
              </button>
            </motion.div>
          </div>
      </div>
    </Layout>
  );
};

export default ChoosePlan;
