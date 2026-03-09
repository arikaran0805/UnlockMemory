import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Loader2, Smartphone, Building2, Wallet, Zap, Lock, BookOpen, UserCircle, CheckCircle2, ShoppingCart, Check, Download, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/components/pricing/pricingData";
import { toast } from "@/hooks/use-toast";

interface CartData {
  careerId: string;
  careerName: string;
  courses: { id: string; name: string; price: number }[];
  subtotal: number;
  bundleDiscount: number;
  promoCode: string | null;
  promoDiscount: number;
  finalTotal: number;
  savings: number;
}

type PaymentMethod = "upi" | "card" | "netbanking" | "wallet";

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "upi", label: "UPI", icon: <Smartphone className="h-5 w-5" />, desc: "Google Pay, PhonePe, Paytm" },
  { id: "card", label: "Credit / Debit Card", icon: <CreditCard className="h-5 w-5" />, desc: "Visa, Mastercard, RuPay" },
  { id: "netbanking", label: "Netbanking", icon: <Building2 className="h-5 w-5" />, desc: "All major banks" },
  { id: "wallet", label: "Wallet", icon: <Wallet className="h-5 w-5" />, desc: "Paytm, MobiKwik, FreeCharge" },
];

const steps = [
  { label: "Cart", icon: ShoppingCart },
  { label: "Checkout", icon: CheckCircle2 },
  { label: "Payment", icon: CreditCard },
  { label: "Complete", icon: Check },
];

const ease4 = [0.16, 1, 0.3, 1] as [number, number, number, number];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.1 + i * 0.08, ease: ease4 },
  }),
};

/* ─── Success Screen ─── */
const CheckoutSuccess = ({ cartData, onGoToLearning }: { cartData: CartData; onGoToLearning: () => void }) => (
  <motion.div
    className="min-h-[70vh] flex items-center justify-center px-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4 }}
  >
    <div className="co-success-card text-center max-w-lg w-full">
      {/* Checkmark */}
      <motion.div
        className="co-success-check mx-auto"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <motion.div
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>

      <motion.h2
        className="text-2xl sm:text-3xl font-bold text-foreground mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, ease: ease4 }}
      >
        Payment Successful
      </motion.h2>
      <motion.p
        className="text-muted-foreground mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
      >
        Your courses are now unlocked.
      </motion.p>

      {/* Course list */}
      <motion.ul
        className="mt-6 space-y-2 text-left"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, ease: ease4 }}
      >
        {cartData.courses.map((c) => (
          <li key={c.id} className="flex items-center gap-2.5 text-sm text-foreground py-1.5 px-3 rounded-lg bg-muted/40">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{c.name}</span>
          </li>
        ))}
      </motion.ul>

      <motion.div
        className="flex flex-col sm:flex-row gap-3 mt-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, ease: ease4 }}
      >
        <button onClick={onGoToLearning} className="checkout-pay-button flex-1 h-12 text-base">
          <GraduationCap className="h-4 w-4" />
          Go to My Learning
        </button>
        <button className="co-secondary-btn flex-1">
          <Download className="h-4 w-4" />
          Download Invoice
        </button>
      </motion.div>
    </div>
  </motion.div>
);

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("upi");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("checkout_cart");
    if (stored) {
      try { setCartData(JSON.parse(stored)); } catch { /* invalid */ }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!cartData || cartData.courses.length === 0) {
    return (
      <Layout>
        <SEOHead title="Checkout" description="Complete your purchase." />
        <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
          <p className="text-muted-foreground">Go back to the plan builder to select courses.</p>
          <Button onClick={() => navigate("/plan")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plan Builder
          </Button>
        </div>
      </Layout>
    );
  }

  const currentStep = paymentSuccess ? 3 : 1;

  return (
    <Layout>
      <SEOHead title="Checkout | Complete Your Purchase" description="Review your order and complete your purchase." />

      <div className="co-page-bg min-h-screen relative overflow-hidden">
        {/* Decorative blur shapes */}
        <div className="co-blur-shape co-blur-1" />
        <div className="co-blur-shape co-blur-2" />
        <div className="co-blur-shape co-blur-3" />

        {/* Progress Bar */}
        <div className="co-progress-bar relative z-10">
          <div className="max-w-[680px] mx-auto px-4">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                return (
                  <div key={step.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <motion.div
                        className={`co-step-dot ${
                          isCompleted ? "co-step-done" : isActive ? "co-step-active" : "co-step-future"
                        }`}
                        initial={false}
                        animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.4, ease: ease4 }}
                      >
                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                      </motion.div>
                      <span className={`text-[11px] font-medium ${isActive ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground/50"}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`flex-1 h-[2px] mx-3 mt-[-18px] rounded-full transition-colors duration-300 ${idx < currentStep ? "bg-primary/40" : "bg-border/60"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-[60px] relative z-10">
          <AnimatePresence mode="wait">
            {paymentSuccess ? (
              <CheckoutSuccess
                key="success"
                cartData={cartData}
                onGoToLearning={() => navigate("/profile?tab=courses")}
              />
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                {/* Back + Title */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
                  >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    Back
                  </button>
                  <h1 className="co-page-title">Checkout</h1>
                </motion.div>

                <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start mt-8 sm:mt-10">
                  {/* Left */}
                  <div className="space-y-8 sm:space-y-10">
                    {/* Account */}
                    <motion.div className="co-card" custom={0} initial="hidden" animate="visible" variants={cardVariants}>
                      <h2 className="co-section-title">Account Details</h2>
                      {user ? (
                        <div className="flex items-center gap-3 mt-5">
                          <div className="co-avatar"><UserCircle className="h-5 w-5 text-primary" /></div>
                          <p className="text-sm font-medium text-foreground truncate flex-1">{user.email}</p>
                          <span className="co-logged-badge"><CheckCircle2 className="h-3 w-3" /> Logged in</span>
                        </div>
                      ) : (
                        <div className="space-y-3 mt-5">
                          <p className="text-sm text-muted-foreground">Sign in or create an account to continue.</p>
                          <div className="flex gap-3">
                            <Button size="sm" onClick={() => navigate("/login?redirect=/checkout")}>Sign In</Button>
                            <Button size="sm" variant="outline" onClick={() => navigate("/signup?redirect=/checkout")}>Create Account</Button>
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Billing */}
                    <motion.div className="co-card" custom={1} initial="hidden" animate="visible" variants={cardVariants}>
                      <h2 className="co-section-title">Billing Information</h2>
                      <div className="grid sm:grid-cols-2 gap-4 mt-5">
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="text-sm font-medium text-foreground">Full Name</Label>
                          <Input id="fullName" placeholder="Your full name" className="co-input" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                          <Input id="email" type="email" placeholder="you@example.com" defaultValue={user?.email || ""} className="co-input" />
                        </div>
                      </div>
                    </motion.div>

                    {/* Payment */}
                    <motion.div className="co-card" custom={2} initial="hidden" animate="visible" variants={cardVariants}>
                      <h2 className="co-section-title">Payment Method</h2>
                      <div className="grid grid-cols-2 gap-3 mt-5">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setSelectedPayment(method.id)}
                            className={`co-payment-tile ${selectedPayment === method.id ? "co-payment-tile-active" : "co-payment-tile-idle"}`}
                          >
                            <div className={`mb-2 transition-colors ${selectedPayment === method.id ? "text-primary" : "text-muted-foreground"}`}>
                              {method.icon}
                            </div>
                            <span className="text-[13px] font-semibold text-foreground leading-tight">{method.label}</span>
                            <span className="text-[11px] text-muted-foreground leading-tight mt-1">{method.desc}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>

                    {/* CTA */}
                    <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants}>
                      <button
                        disabled={!user}
                        onClick={() => {
                          toast({ title: "Payment integration coming soon", description: "We'll notify you when checkout is fully available." });
                          // Uncomment below to test success screen:
                          // setPaymentSuccess(true);
                        }}
                        className="co-pay-btn w-full"
                      >
                        <Lock className="h-[18px] w-[18px]" />
                        <span>Pay {formatPrice(cartData.finalTotal)} Securely</span>
                      </button>

                      <div className="co-trust-divider" />
                      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 text-[13px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Secure Payment</span>
                        <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Instant Course Access</span>
                        <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> UPI · Cards · Netbanking</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right: Summary */}
                  <div className="order-last lg:order-none">
                    <motion.div
                      className="lg:sticky lg:top-24"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2, ease: ease4 }}
                    >
                      <div className="co-summary-card">
                        <h3 className="text-lg font-bold text-foreground">Order Summary</h3>
                        <p className="text-xs text-muted-foreground mt-1">{cartData.careerName}</p>

                        <ul className="space-y-3.5 mt-6 max-h-[300px] overflow-y-auto pr-1 co-scrollbar">
                          {cartData.courses.map((c) => (
                            <li key={c.id} className="flex items-center gap-3">
                              <div className="co-course-icon"><BookOpen className="h-4 w-4 text-primary" /></div>
                              <span className="text-sm text-foreground truncate flex-1">{c.name}</span>
                              <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">{formatPrice(c.price)}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="co-divider" />

                        <div className="space-y-2.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="text-foreground font-medium">{formatPrice(cartData.subtotal)}</span>
                          </div>
                          {cartData.bundleDiscount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Bundle Discount</span>
                              <span className="co-discount font-semibold">−{formatPrice(cartData.bundleDiscount)}</span>
                            </div>
                          )}
                          {cartData.promoCode && cartData.promoDiscount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Promo: {cartData.promoCode}</span>
                              <span className="co-discount font-semibold">−{formatPrice(cartData.promoDiscount)}</span>
                            </div>
                          )}
                        </div>

                        <div className="co-divider" />

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-base">Total</span>
                          <span className="co-total-price">{formatPrice(cartData.finalTotal)}</span>
                        </div>

                        {cartData.savings > 0 && (
                          <div className="co-savings-badge mt-4">You saved {formatPrice(cartData.savings)}</div>
                        )}

                        <p className="text-[10px] text-center text-muted-foreground mt-3">
                          Subtotal does not include applicable taxes.
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
