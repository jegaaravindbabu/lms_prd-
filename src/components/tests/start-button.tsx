"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startAttempt } from "@/app/tests/actions";

export function StartButton({ testId, disabled }: { testId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await startAttempt(testId);
            if (res.ok && res.attemptId) router.push(`/tests/${testId}/attempt/${res.attemptId}`);
            else setError(res.error ?? "Could not start.");
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <><Play className="size-4" /> Start test</>}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
