"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markComplete } from "@/app/learn/actions";

export function MarkComplete({
  lessonId,
  initialCompleted,
}: {
  lessonId: string;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialCompleted);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-sm text-gold">
        <CheckCircle2 className="size-4" /> Completed
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() =>
        start(async () => {
          const res = await markComplete(lessonId);
          if (res.ok) { setDone(true); router.refresh(); }
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Mark complete</>}
    </Button>
  );
}
