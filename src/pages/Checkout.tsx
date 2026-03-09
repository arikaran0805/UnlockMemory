import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Loader2, Smartphone, Building2, Wallet, Zap, Lock, BookOpen, UserCircle, CheckCircle2, ShoppingCart, Check, Download, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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


/* ─── Success Screen ─── */
const CheckoutSuccess = ({ cartData, onGoToLearning }: { cartData: CartData; onGoToLearning: () => void }) => (
  <motion.div
    className="min-h-[70vh] flex items-center justify-center px-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4 }}
  >
    <Card className="border-border max-w-lg w-full">
      <CardContent className="p-8 text-center">
        {/* Checkmark */}
        <motion.div
          className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <Check className="h-8 w-8 text-primary-foreground" strokeWidth={3} />
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
          <Button onClick={onGoToLearning} className="flex-1 gap-2">
            <GraduationCap className="h-4 w-4" />
            Go to My Learning
          </Button>
          <Button variant="outline" className="flex-1 gap-2">
            <Download className="h-4 w-4" />
            Download Invoice
          </Button>
        </motion.div>
      </CardContent>
    </Card>
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

      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-20">
          <AnimatePresence mode="wait">
            {paymentSuccess ? (
              <CheckoutSuccess
                key="success"
                cartData={cartData}
                onGoToLearning={() => navigate("/profile?tab=courses")}
              />
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                {/* Title */}
                <motion.div className="text-center mb-12 sm:mb-16 space-y-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">Checkout</h1>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">Review your order and complete your purchase.</p>
                </motion.div>

                <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
                  {/* Left */}
                  <div className="space-y-8">
                    {/* Account */}
                    <div>
                      <Card className="border-border">
                        <CardContent className="p-6 space-y-4">
                          <h2 className="font-semibold text-foreground text-lg">Account Details</h2>
                          {user ? (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <UserCircle className="h-5 w-5 text-primary" />
                              </div>
                              <p className="text-sm font-medium text-foreground truncate flex-1">{user.email}</p>
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3" /> Logged in
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">Sign in or create an account to continue.</p>
                              <div className="flex gap-3">
                                <Button size="sm" onClick={() => navigate("/login?redirect=/checkout")}>Sign In</Button>
                                <Button size="sm" variant="outline" onClick={() => navigate("/signup?redirect=/checkout")}>Create Account</Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Billing */}
                    <div>
                      <Card className="border-border">
                        <CardContent className="p-6 space-y-4">
                          <h2 className="font-semibold text-foreground text-lg">Billing Information</h2>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="fullName" className="text-sm font-medium text-foreground">Full Name</Label>
                              <Input id="fullName" placeholder="Your full name" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                              <Input id="email" type="email" placeholder="you@example.com" defaultValue={user?.email || ""} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Payment */}
                    <div>
                      <Card className="border-border">
                        <CardContent className="p-6 space-y-4">
                          <h2 className="font-semibold text-foreground text-lg">Payment Method</h2>
                          <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map((method) => (
                              <button
                                key={method.id}
                                onClick={() => setSelectedPayment(method.id)}
                                className={`flex flex-col items-center text-center p-4 rounded-lg border transition-all duration-200 ${
                                  selectedPayment === method.id
                                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                                    : "border-border hover:border-primary/40 bg-card"
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
                        </CardContent>
                      </Card>
                    </div>

                    {/* CTA */}
                    <div>
                      <Button
                        disabled={!user}
                        size="lg"
                        className="w-full h-14 text-base font-semibold gap-2"
                        onClick={() => {
                          toast({ title: "Payment integration coming soon", description: "We'll notify you when checkout is fully available." });
                        }}
                      >
                        <Lock className="h-[18px] w-[18px]" />
                        <span>Pay {formatPrice(cartData.finalTotal)} Securely</span>
                      </Button>

                      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 text-[13px] text-muted-foreground mt-4">
                        <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Secure Payment</span>
                        <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Instant Course Access</span>
                        <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> UPI · Cards · Netbanking</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Summary */}
                  <div className="order-last lg:order-none">
                    <motion.div
                      className="lg:sticky lg:top-20"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2, ease: ease4 }}
                    >
                      <Card className="border-border">
                        <CardContent className="p-6 space-y-4">
                          <h3 className="text-lg font-bold text-foreground">Order Summary</h3>
                          <p className="text-xs text-muted-foreground">{cartData.careerName}</p>

                          <ul className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                            {cartData.courses.map((c) => (
                              <li key={c.id} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <BookOpen className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm text-foreground truncate flex-1">{c.name}</span>
                                <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">{formatPrice(c.price)}</span>
                              </li>
                            ))}
                          </ul>

                          <Separator />

                          <div className="space-y-2.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="text-foreground font-medium">{formatPrice(cartData.subtotal)}</span>
                            </div>
                            {cartData.bundleDiscount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Bundle Discount</span>
                                <span className="text-primary font-semibold">−{formatPrice(cartData.bundleDiscount)}</span>
                              </div>
                            )}
                            {cartData.promoCode && cartData.promoDiscount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Promo: {cartData.promoCode}</span>
                                <span className="text-primary font-semibold">−{formatPrice(cartData.promoDiscount)}</span>
                              </div>
                            )}
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-base">Total</span>
                            <span className="text-2xl font-bold text-foreground">{formatPrice(cartData.finalTotal)}</span>
                          </div>

                          {cartData.savings > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10">
                              <p className="text-xs font-medium text-primary">You saved {formatPrice(cartData.savings)}</p>
                            </div>
                          )}

                          <p className="text-[10px] text-center text-muted-foreground">
                            Subtotal does not include applicable taxes.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Checkout;
