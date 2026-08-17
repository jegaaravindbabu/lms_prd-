"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enrollCourse } from "@/app/learn/actions";

export function EnrollButton({
  courseId,
  firstLessonHref,
  priceLabel,
  isAuthed,
}: {
  courseId: string;
  firstLessonHref: string | null;
  priceLabel: string;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onEnroll() {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    setError(null);
    start(async () => {
      const res = await enrollCourse(courseId);
      if (res.ok) {
        if (firstLessonHref) router.push(firstLessonHref);
        else router.refresh();
      } else {
        setError(res.error ?? "Could not enroll.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button size="lg" className="w-full" onClick={onEnroll} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Enroll — {priceLabel} <ArrowRight className="size-4" />
          </>
        )}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Check className="size-3.5 text-gold" /> Lifetime access · Learn at your pace
      </p>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
