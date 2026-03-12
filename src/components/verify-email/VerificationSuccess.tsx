import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface VerificationSuccessProps {
  redirectTo?: string | null;
}

const VerificationSuccess = ({ redirectTo }: VerificationSuccessProps) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  const loginPath = `/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(loginPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, loginPath]);

  const features = [
    "Explore career paths",
    "Practice real-world datasets",
    "Track learning progress",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[420px] mx-auto px-4"
    >
      <div className="rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5 p-8 sm:p-10 space-y-8">
        {/* Animated check */}
        <div className="flex justify-center pt-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 14 }}
            className="relative"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ delay: 0.4, duration: 1.4, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-emerald-400/20"
            />
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-400/10 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 12 }}
                className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55, duration: 0.3 }}
                >
                  <Check className="h-6 w-6 text-white" strokeWidth={3} />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Copy */}
        <div className="text-center space-y-1.5">
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
            Email Verified
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome to UnlockMemory. Your account is ready.
          </p>
        </div>

        {/* Features */}
        <div className="rounded-2xl bg-muted/30 border border-border/30 p-5 space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            What you can do now
          </p>
          <ul className="space-y-2.5">
            {features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.12, ease: "easeOut" }}
                className="flex items-center gap-2.5 text-[13px] text-foreground/90"
              >
                <div className="flex-shrink-0 w-[18px] h-[18px] rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                </div>
                {feature}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="space-y-3 pt-1">
          <Link to={loginPath} className="block">
            <Button className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-emerald-500/15 transition-all duration-200 text-sm">
              Start Learning
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-[11px] text-center text-muted-foreground/70"
          >
            Redirecting you in {countdown} second{countdown !== 1 ? "s" : ""}…
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default VerificationSuccess;
