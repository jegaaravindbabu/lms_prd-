"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTest } from "@/app/(dashboard)/admin/tests/actions";

export function NewTest() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New test</Button>;

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await createTest(fd);
          if (res.ok && res.id) router.push(`/admin/tests/${res.id}`);
          else setError(res.error ?? "Could not create.");
        })
      }
      className="flex w-full max-w-md items-center gap-2"
    >
      <Input name="title" placeholder="Test title…" autoFocus required className="h-11" />
      <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <>Create <ArrowRight className="size-4" /></>}</Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
