"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2, Phone, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPlatformOtp, verifyPlatformOtp, type PlatformActionState } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <>{label} <ArrowRight className="size-4" /></>}
    </Button>
  );
}

export function PlatformLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onRequest(formData: FormData) {
    setError(null);
    const res: PlatformActionState = await requestPlatformOtp({ ok: false }, formData);
    if (res.ok && res.step === "otp") { setPhone(String(formData.get("phone") ?? "")); setStep("otp"); }
    else setError(res.error ?? "Something went wrong.");
  }

  async function onVerify(formData: FormData) {
    setError(null);
    formData.set("phone", phone);
    const res: PlatformActionState = await verifyPlatformOtp({ ok: false }, formData);
    if (res.ok) { router.push("/platform"); router.refresh(); }
    else setError(res.error ?? "Incorrect code.");
  }

  return step === "phone" ? (
    <form action={onRequest} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone">Admin phone</Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="phone" name="phone" type="tel" placeholder="Platform admin number" className="pl-11" required autoFocus />
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Submit label="Send code" />
    </form>
  ) : (
    <form action={onVerify} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="code">Verification code</Label>
          <button type="button" onClick={() => { setStep("phone"); setError(null); }} className="text-xs text-muted-foreground hover:text-foreground">Change number</button>
        </div>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="code" name="code" inputMode="numeric" placeholder="6-digit code" className="pl-11 tracking-[0.5em]" maxLength={6} required autoFocus />
        </div>
        <p className="text-xs text-muted-foreground">In dev, the code prints to the server log.</p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Submit label="Enter console" />
    </form>
  );
}
