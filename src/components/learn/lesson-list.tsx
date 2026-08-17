import Link from "next/link";
import { PlayCircle, FileText, Type, ListChecks, Lock, CheckCircle2 } from "lucide-react";
import type { LessonType } from "@prisma/client";

const ICON: Record<LessonType, React.ElementType> = {
  VIDEO: PlayCircle,
  PDF: FileText,
  TEXT: Type,
  QUIZ: ListChecks,
};

export type LessonRow = {
  id: string;
  title: string;
  type: LessonType;
  isPreview: boolean;
  durationSec: number | null;
  completed: boolean;
  locked: boolean;
};

export type SectionRow = { id: string; title: string; lessons: LessonRow[] };

export function LessonList({
  courseId,
  sections,
  currentLessonId,
}: {
  courseId: string;
  sections: SectionRow[];
  currentLessonId: string;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.id}>
          <div className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {section.title}
          </div>
          <div className="space-y-1">
            {section.lessons.map((lesson) => {
              const Icon = lesson.completed ? CheckCircle2 : lesson.locked ? Lock : ICON[lesson.type];
              const active = lesson.id === currentLessonId;
              const body = (
                <div
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-white/[0.05] text-foreground ring-1 ring-inset ring-white/10" : "text-muted-foreground",
                    lesson.locked ? "opacity-60" : "hover:bg-white/[0.03] hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "size-[18px] shrink-0",
                      lesson.completed ? "text-gold" : active ? "text-brand" : "text-muted-foreground",
                    ].join(" ")}
                  />
                  <span className="flex-1 leading-snug">{lesson.title}</span>
                  {lesson.durationSec ? (
                    <span className="text-[0.7rem] text-muted-foreground">{Math.round(lesson.durationSec / 60)}m</span>
                  ) : null}
                </div>
              );
              return lesson.locked ? (
                <div key={lesson.id} title="Enroll to unlock">{body}</div>
              ) : (
                <Link key={lesson.id} href={`/learn/${courseId}/${lesson.id}`}>{body}</Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
