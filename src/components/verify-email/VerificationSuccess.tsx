import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const VerificationSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const features = [
    "Explore structured career paths",
    "Practice real-world datasets",
    "Track your learning progress",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      <div className="rounded-2xl border border-border/50 bg-card shadow-xl shadow-primary/5 p-8 sm:p-10 space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <span className="text-lg font-bold text-primary-foreground">U</span>
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">UnlockMemory</span>
        </div>

        {/* Animated check */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400/20 to-primary/10 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 12 }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
              >
                <motion.div
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <Check className="h-7 w-7 text-white" strokeWidth={3} />
                </motion.div>
              </motion.div>
            </div>
            {/* Pulse ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
            />
          </motion.div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Email Verified Successfully
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your UnlockMemory account is ready. Start building your learning journey.
          </p>
        </div>

        {/* Features */}
        <div className="rounded-xl bg-muted/40 border border-border/40 p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            What you can do next
          </p>
          <ul className="space-y-2.5">
            {features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.15 }}
                className="flex items-center gap-2.5 text-sm text-foreground"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                </div>
                {feature}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link to="/login" className="block">
            <Button className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200">
              Start Learning
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-center text-muted-foreground">
            Redirecting you to login in {countdown} second{countdown !== 1 ? "s" : ""}…
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default VerificationSuccess;
