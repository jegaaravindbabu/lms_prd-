"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Globe, EyeOff, Archive, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCourseStatus, deleteCourse } from "@/app/(dashboard)/admin/courses/actions";
import type { CourseStatus } from "@prisma/client";

export function PublishControls({
  courseId,
  slug,
  status,
  canPublish,
}: {
  courseId: string;
  slug: string;
  status: CourseStatus;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const change = (next: CourseStatus) =>
    start(async () => {
      await setCourseStatus(courseId, next);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      await deleteCourse(courseId);
      router.push("/admin/courses");
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PUBLISHED" && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/courses/${slug}`} target="_blank"><ExternalLink className="size-4" /> View live</Link>
        </Button>
      )}

      {status !== "PUBLISHED" ? (
        <Button size="sm" onClick={() => change("PUBLISHED")} disabled={pending || !canPublish} title={canPublish ? "" : "Add at least one lesson first"}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <><Globe className="size-4" /> Publish</>}
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => change("DRAFT")} disabled={pending}>
          <EyeOff className="size-4" /> Unpublish
        </Button>
      )}

      {status !== "ARCHIVED" ? (
        <Button size="sm" variant="ghost" onClick={() => change("ARCHIVED")} disabled={pending}>
          <Archive className="size-4" /> Archive
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => change("DRAFT")} disabled={pending}>
          Restore
        </Button>
      )}

      {confirming ? (
        <span className="inline-flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Delete?</span>
          <Button size="sm" variant="outline" onClick={remove} disabled={pending} className="border-red-500/40 text-red-400 hover:bg-red-500/10">Yes, delete</Button>
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setConfirming(false)}>Cancel</button>
        </span>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} disabled={pending} className="text-muted-foreground hover:text-red-400">
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
