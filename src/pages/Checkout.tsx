import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Loader2, Smartphone, Building2, Wallet, Zap, Lock, BookOpen, UserCircle, CheckCircle2, ShoppingCart, Check } from "lucide-react";
import { motion } from "framer-motion";
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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("upi");

  useEffect(() => {
    const stored = sessionStorage.getItem("checkout_cart");
    if (stored) {
      try {
        setCartData(JSON.parse(stored));
      } catch {
        // invalid data
      }
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

  const currentStep = 1; // Checkout step

  return (
    <Layout>
      <SEOHead title="Checkout | Complete Your Purchase" description="Review your order and complete your purchase." />

      <div className="checkout-page-bg min-h-screen">
        {/* Progress Bar */}
        <div className="checkout-progress-bar">
          <div className="max-w-[680px] mx-auto px-4">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                return (
                  <div key={step.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`checkout-step-dot ${
                          isCompleted
                            ? "checkout-step-completed"
                            : isActive
                            ? "checkout-step-active"
                            : "checkout-step-inactive"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <StepIcon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
                          isActive
                            ? "text-primary"
                            : isCompleted
                            ? "text-primary/70"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`flex-1 h-[2px] mx-3 mt-[-18px] rounded-full ${
                          idx < currentStep ? "bg-primary/40" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-[60px]">
          {/* Back + Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>

            <h1 className="checkout-page-title">Checkout</h1>
          </motion.div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start mt-8 sm:mt-10">
            {/* Left Column */}
            <div className="space-y-8 sm:space-y-10">
              {/* Account */}
              <motion.div className="checkout-card" custom={0} initial="hidden" animate="visible" variants={cardVariants}>
                <h2 className="checkout-section-title">Account Details</h2>
                {user ? (
                  <div className="flex items-center gap-3 mt-5">
                    <div className="checkout-avatar">
                      <UserCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                    </div>
                    <span className="checkout-logged-badge">
                      <CheckCircle2 className="h-3 w-3" />
                      Logged in
                    </span>
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
              <motion.div className="checkout-card" custom={1} initial="hidden" animate="visible" variants={cardVariants}>
                <h2 className="checkout-section-title">Billing Information</h2>
                <div className="grid sm:grid-cols-2 gap-4 mt-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-foreground">Full Name</Label>
                    <Input id="fullName" placeholder="Your full name" className="checkout-input" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" defaultValue={user?.email || ""} className="checkout-input" />
                  </div>
                </div>
              </motion.div>

              {/* Payment */}
              <motion.div className="checkout-card" custom={2} initial="hidden" animate="visible" variants={cardVariants}>
                <h2 className="checkout-section-title">Payment Method</h2>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`checkout-payment-option ${
                        selectedPayment === method.id ? "checkout-payment-option-selected" : "checkout-payment-option-default"
                      }`}
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
                  }}
                  className="checkout-pay-button w-full"
                >
                  <Lock className="h-[18px] w-[18px]" />
                  <span>Pay {formatPrice(cartData.finalTotal)} Securely</span>
                </button>

                {/* Trust */}
                <div className="checkout-trust-divider" />
                <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Secure Payment</span>
                  <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Instant Course Access</span>
                  <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> UPI · Cards · Netbanking</span>
                </div>
              </motion.div>
            </div>

            {/* Right: Order Summary */}
            <div className="order-last lg:order-none">
              <motion.div
                className="lg:sticky lg:top-24"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <div className="checkout-summary-card">
                  <h3 className="text-lg font-bold text-foreground">Order Summary</h3>
                  <p className="text-xs text-muted-foreground mt-1">{cartData.careerName}</p>

                  <ul className="space-y-3.5 mt-6 max-h-[300px] overflow-y-auto pr-1 checkout-scrollbar">
                    {cartData.courses.map((c) => (
                      <li key={c.id} className="flex items-center gap-3">
                        <div className="checkout-course-icon">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground truncate flex-1">{c.name}</span>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">{formatPrice(c.price)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="checkout-divider" />

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground font-medium">{formatPrice(cartData.subtotal)}</span>
                    </div>

                    {cartData.bundleDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Bundle Discount</span>
                        <span className="checkout-discount-text font-medium">−{formatPrice(cartData.bundleDiscount)}</span>
                      </div>
                    )}

                    {cartData.promoCode && cartData.promoDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Promo: {cartData.promoCode}</span>
                        <span className="checkout-discount-text font-medium">−{formatPrice(cartData.promoDiscount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="checkout-divider" />

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-base">Total</span>
                    <span className="checkout-total-price">{formatPrice(cartData.finalTotal)}</span>
                  </div>

                  {cartData.savings > 0 && (
                    <div className="checkout-savings-badge mt-4">
                      You saved {formatPrice(cartData.savings)}
                    </div>
                  )}

                  <p className="text-[10px] text-center text-muted-foreground mt-3">
                    Subtotal does not include applicable taxes.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
