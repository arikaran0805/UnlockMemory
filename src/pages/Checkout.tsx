import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);

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

      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <motion.h1
          className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Checkout
        </motion.h1>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Left: Form */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Account section */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Account Details</h2>
              {user ? (
                <div className="space-y-1">
                  <p className="text-sm text-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Logged in</p>
                </div>
              ) : (
                <div className="space-y-3">
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
            </div>

            {/* Billing info */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Billing Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    defaultValue={user?.email || ""}
                  />
                </div>
              </div>
            </div>

            {/* Payment placeholder */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Payment</h2>
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center space-y-2">
                <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Payment integration coming soon.
                </p>
              </div>
            </div>

            {/* Place order */}
            <Button
              className="w-full h-12 text-base font-semibold"
              size="lg"
              disabled={!user}
              onClick={() => {
                toast({
                  title: "Payment integration coming soon",
                  description: "We'll notify you when checkout is fully available.",
                });
              }}
            >
              Place Order · {formatPrice(cartData.finalTotal)}
            </Button>

            {/* Trust */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
              Secure checkout · Transparent pricing · No hidden fees
            </div>
          </motion.div>

          {/* Right: Order summary */}
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-6 space-y-4 shadow-md">
              <h3 className="font-bold text-foreground text-lg">Order Summary</h3>
              <p className="text-xs text-muted-foreground">{cartData.careerName}</p>

              <Separator />

              <ul className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                {cartData.courses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm gap-2">
                    <span className="text-foreground truncate mr-2">{c.name}</span>
                    <span className="text-foreground font-medium whitespace-nowrap shrink-0">
                      {formatPrice(c.price)}
                    </span>
                  </li>
                ))}
              </ul>

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">Subtotal</span>
                <span className="text-foreground font-medium">{formatPrice(cartData.subtotal)}</span>
              </div>

              {cartData.bundleDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bundle Discount</span>
                  <span className="text-primary font-medium">−{formatPrice(cartData.bundleDiscount)}</span>
                </div>
              )}

              {cartData.promoCode && cartData.promoDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Promo: {cartData.promoCode}</span>
                  <span className="text-primary font-medium">−{formatPrice(cartData.promoDiscount)}</span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-base">Total</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(cartData.finalTotal)}</span>
              </div>

              {cartData.savings > 0 && (
                <p className="text-xs text-primary font-medium text-center">
                  You saved {formatPrice(cartData.savings)}
                </p>
              )}

              <p className="text-[10px] text-center text-muted-foreground">
                Subtotal does not include applicable taxes.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
