import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, CreditCard, Loader2, Smartphone, Building2, Wallet, Zap, Lock, BookOpen, UserCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
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
          <p className="text-muted-foreground">
            Go back to the plan builder to select courses.
          </p>
          <Button onClick={() => navigate("/plan")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plan Builder
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title="Checkout | Complete Your Purchase" description="Review your order and complete your purchase." />

      <div className="checkout-page-bg min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Back link */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>

          <motion.h1
            className="text-3xl sm:text-[36px] font-bold tracking-tight text-foreground mb-8 sm:mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            Checkout
          </motion.h1>

          <div className="grid lg:grid-cols-[1fr_35%] gap-6 lg:gap-8 items-start">
            {/* Left: Form */}
            <div className="space-y-8 sm:space-y-10">
              {/* Account section */}
              <motion.div
                className="checkout-card"
                custom={0}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <h2 className="checkout-section-title">Account Details</h2>
                {user ? (
                  <div className="flex items-center gap-3 mt-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Logged in
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Sign in or create an account to continue.
                    </p>
                    <div className="flex gap-3">
                      <Button size="sm" onClick={() => navigate("/login?redirect=/checkout")}>
                        Sign In
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("/signup?redirect=/checkout")}>
                        Create Account
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Billing info */}
              <motion.div
                className="checkout-card"
                custom={1}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <h2 className="checkout-section-title">Billing Information</h2>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-foreground">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Your full name"
                      className="checkout-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      defaultValue={user?.email || ""}
                      className="checkout-input"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Payment method selector */}
              <motion.div
                className="checkout-card"
                custom={2}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <h2 className="checkout-section-title">Payment Method</h2>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`checkout-payment-option ${
                        selectedPayment === method.id
                          ? "checkout-payment-option-selected"
                          : "checkout-payment-option-default"
                      }`}
                    >
                      <div className={`mb-2 ${selectedPayment === method.id ? "text-primary" : "text-muted-foreground"}`}>
                        {method.icon}
                      </div>
                      <span className="text-sm font-semibold text-foreground">{method.label}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">{method.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Pay button */}
              <motion.div
                custom={3}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <button
                  disabled={!user}
                  onClick={() => {
                    toast({
                      title: "Payment integration coming soon",
                      description: "We'll notify you when checkout is fully available.",
                    });
                  }}
                  className="checkout-pay-button w-full"
                >
                  <Lock className="h-4 w-4" />
                  Pay {formatPrice(cartData.finalTotal)} Securely
                </button>

                {/* Trust signals */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Secure checkout
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Instant access
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    UPI · Cards · Netbanking
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right: Order summary */}
            <div>
              <motion.div
                className="lg:sticky lg:top-20"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <div className="checkout-summary-card">
                  <h3 className="text-lg font-bold text-foreground">Order Summary</h3>
                  <p className="text-xs text-muted-foreground mt-1">{cartData.careerName}</p>

                  {/* Course list */}
                  <ul className="space-y-3 mt-5 max-h-[280px] overflow-y-auto pr-1 checkout-scrollbar">
                    {cartData.courses.map((c) => (
                      <li key={c.id} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground truncate flex-1">{c.name}</span>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">
                          {formatPrice(c.price)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Divider */}
                  <div className="checkout-divider" />

                  {/* Subtotal */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground font-medium">{formatPrice(cartData.subtotal)}</span>
                  </div>

                  {cartData.bundleDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Bundle Discount</span>
                      <span className="checkout-discount-text font-medium">−{formatPrice(cartData.bundleDiscount)}</span>
                    </div>
                  )}

                  {cartData.promoCode && cartData.promoDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Promo: {cartData.promoCode}</span>
                      <span className="checkout-discount-text font-medium">−{formatPrice(cartData.promoDiscount)}</span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="checkout-divider" />

                  {/* Total */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="checkout-total-price">{formatPrice(cartData.finalTotal)}</span>
                  </div>

                  {cartData.savings > 0 && (
                    <p className="checkout-savings-badge mt-3">
                      You saved {formatPrice(cartData.savings)}
                    </p>
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
