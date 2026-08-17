"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Check, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startCheckout, confirmPayment, previewCoupon } from "@/app/checkout/actions";
import { formatMoney } from "@/lib/utils";

declare global {
  interface Window { Razorpay?: any }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutButton({
  courseId,
  basePrice,
  currency,
  isAuthed,
  firstLessonHref,
}: {
  courseId: string;
  basePrice: number;
  currency: string;
  isAuthed: boolean;
  firstLessonHref: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showCoupon, setShowCoupon] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; total: number; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const effectiveTotal = applied ? applied.total : basePrice;

  function apply() {
    if (!code.trim()) return;
    setCouponMsg(null);
    start(async () => {
      const res = await previewCoupon(courseId, code);
      if (res.ok) {
        setApplied({ code: code.trim().toUpperCase(), total: res.total!, discount: res.discount! });
        setCouponMsg(null);
      } else {
        setApplied(null);
        setCouponMsg(res.error ?? "Invalid code.");
      }
    });
  }

  function onPay() {
    if (!isAuthed) { router.push("/login"); return; }
    setError(null);
    start(async () => {
      const res = await startCheckout(courseId, applied?.code ?? null);
      if (!res.ok) { setError(res.error); return; }
      if (res.free) {
        router.push(firstLessonHref ?? `/dashboard/courses`);
        router.refresh();
        return;
      }
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) { setError("Couldn't load the payment window. Check your connection."); return; }

      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.orderId,
        amount: res.amount,
        currency: res.currency,
        name: res.courseTitle,
        description: "Course enrollment",
        prefill: { name: res.prefill.name, contact: res.prefill.contact },
        theme: { color: "#4F46E5" },
        handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          start(async () => {
            const c = await confirmPayment({
              orderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              signature: r.razorpay_signature,
            });
            if (c.ok) {
              router.push(firstLessonHref ?? `/courses/${c.slug ?? ""}`);
              router.refresh();
            } else {
              setError(c.error ?? "Payment verification failed.");
            }
          });
        },
        modal: { ondismiss: () => setError(null) },
      });
      rzp.on("payment.failed", () => setError("Payment failed. You can try again."));
      rzp.open();
    });
  }

  return (
    <div className="space-y-3">
      {applied && (
        <div className="flex items-center justify-between rounded-xl border border-gold/25 bg-gold/5 px-4 py-2.5 text-sm">
          <span className="inline-flex items-center gap-2 text-gold"><Tag className="size-4" /> {applied.code} applied</span>
          <span className="text-muted-foreground">
            −{formatMoney(applied.discount, currency)} · <span className="text-foreground">{formatMoney(applied.total, currency)}</span>
          </span>
        </div>
      )}

      <Button size="lg" className="w-full" onClick={onPay} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <>Enroll — {formatMoney(effectiveTotal, currency)} <ArrowRight className="size-4" /></>}
      </Button>

      {!showCoupon ? (
        <button onClick={() => setShowCoupon(true)} className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Tag className="size-3.5" /> Have a coupon?
        </button>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="COUPON CODE"
              className="h-10 tracking-wider"
            />
            <Button variant="outline" onClick={apply} disabled={pending} className="h-10">Apply</Button>
            <button onClick={() => { setShowCoupon(false); setApplied(null); setCode(""); setCouponMsg(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          {couponMsg && <p className="text-xs text-red-400">{couponMsg}</p>}
          {applied && <p className="inline-flex items-center gap-1 text-xs text-gold"><Check className="size-3.5" /> Coupon applied</p>}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Check className="size-3.5 text-gold" /> Lifetime access · Secure payment
      </p>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
