"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCourse } from "@/app/(dashboard)/admin/courses/actions";

type Course = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  price: string; // Decimal serialized
  currency: string;
  isFree: boolean;
};

export function CourseDetailsForm({ course }: { course: Course }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [isFree, setIsFree] = useState(course.isFree);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setSaved(false);
          const res = await updateCourse(course.id, fd);
          if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2500); }
        })
      }
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={course.title} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" name="subtitle" defaultValue={course.subtitle ?? ""} placeholder="One compelling line" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          defaultValue={course.description ?? ""}
          rows={5}
          placeholder="What will students learn?"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:border-brand/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
        <Input id="thumbnailUrl" name="thumbnailUrl" defaultValue={course.thumbnailUrl ?? ""} placeholder="https://…" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price ({course.currency})</Label>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={String(Number(course.price))}
            disabled={isFree}
            className={isFree ? "opacity-50" : ""}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="isFree"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="size-4 accent-[hsl(var(--brand))]"
            />
            Free course
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Save details"}
        </Button>
        {saved && <span className="inline-flex items-center gap-1.5 text-sm text-gold"><Check className="size-4" /> Saved</span>}
      </div>
    </form>
  );
}
