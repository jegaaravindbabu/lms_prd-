"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Loader2, PlayCircle, FileText,
  Type as TypeIcon, ListChecks, Pencil, X, Check, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadLessonFile } from "@/lib/upload";
import { Badge } from "@/components/ui/badge";
import {
  createSection, renameSection, deleteSection, moveSection,
  createLesson, updateLesson, deleteLesson, moveLesson, type LessonInput,
} from "@/app/(dashboard)/admin/courses/actions";
import type { LessonType, VideoProvider } from "@prisma/client";

export type EditorLesson = {
  id: string;
  title: string;
  type: LessonType;
  isPreview: boolean;
  videoProvider: VideoProvider | null;
  videoId: string | null;
  durationSec: number | null;
  contentUrl: string | null;
  textContent: string | null;
};
export type EditorSection = { id: string; title: string; lessons: EditorLesson[] };

const TYPE_ICON: Record<LessonType, React.ElementType> = {
  VIDEO: PlayCircle, PDF: FileText, TEXT: TypeIcon, QUIZ: ListChecks,
};

export function CurriculumEditor({ courseId, sections }: { courseId: string; sections: EditorSection[] }) {
  const [addingSection, setAddingSection] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const refresh = () => router.refresh();

  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <SectionCard
          key={section.id}
          courseId={courseId}
          section={section}
          isFirst={i === 0}
          isLast={i === sections.length - 1}
          onChange={refresh}
        />
      ))}

      {addingSection ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createSection(courseId, newTitle);
              if (res.ok) { setNewTitle(""); setAddingSection(false); refresh(); }
            });
          }}
          className="flex items-center gap-2"
        >
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Section title (e.g. Foundations)" autoFocus className="h-11" />
          <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : "Add"}</Button>
          <button type="button" onClick={() => setAddingSection(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setAddingSection(true)}>
          <Plus className="size-4" /> Add section
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function SectionCard({
  courseId, section, isFirst, isLast, onChange,
}: {
  courseId: string; section: EditorSection; isFirst: boolean; isLast: boolean; onChange: () => void;
}) {
  const [pending, start] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [addingLesson, setAddingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); onChange(); });

  return (
    <div className="glass rounded-2xl p-5">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <GripVertical className="size-4 text-muted-foreground/60" />
        {editingTitle ? (
          <form
            onSubmit={(e) => { e.preventDefault(); act(async () => { await renameSection(section.id, courseId, title); setEditingTitle(false); }); }}
            className="flex flex-1 items-center gap-2"
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="h-9" />
            <Button size="sm" type="submit" disabled={pending}><Check className="size-4" /></Button>
            <button type="button" onClick={() => { setTitle(section.title); setEditingTitle(false); }} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </form>
        ) : (
          <>
            <h3 className="flex-1 font-display text-lg text-foreground">{section.title}</h3>
            <span className="text-xs text-muted-foreground">{section.lessons.length} lessons</span>
            <button onClick={() => setEditingTitle(true)} className="text-muted-foreground hover:text-foreground" title="Rename"><Pencil className="size-4" /></button>
            <button disabled={isFirst || pending} onClick={() => act(() => moveSection(section.id, courseId, "up"))} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="size-4" /></button>
            <button disabled={isLast || pending} onClick={() => act(() => moveSection(section.id, courseId, "down"))} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="size-4" /></button>
            <button onClick={() => act(() => deleteSection(section.id, courseId))} className="text-muted-foreground hover:text-red-400" title="Delete section"><Trash2 className="size-4" /></button>
          </>
        )}
      </div>

      {/* Lessons */}
      <div className="mt-4 space-y-2">
        {section.lessons.map((lesson, i) =>
          editingLessonId === lesson.id ? (
            <LessonForm
              key={lesson.id}
              courseId={courseId}
              sectionId={section.id}
              lesson={lesson}
              onDone={() => { setEditingLessonId(null); onChange(); }}
              onCancel={() => setEditingLessonId(null)}
            />
          ) : (
            <LessonRow
              key={lesson.id}
              courseId={courseId}
              sectionId={section.id}
              lesson={lesson}
              isFirst={i === 0}
              isLast={i === section.lessons.length - 1}
              onEdit={() => setEditingLessonId(lesson.id)}
              onChange={onChange}
            />
          )
        )}

        {addingLesson ? (
          <LessonForm
            courseId={courseId}
            sectionId={section.id}
            onDone={() => { setAddingLesson(false); onChange(); }}
            onCancel={() => setAddingLesson(false)}
          />
        ) : (
          <button
            onClick={() => setAddingLesson(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/12 py-2.5 text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
          >
            <Plus className="size-4" /> Add lesson
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function LessonRow({
  courseId, sectionId, lesson, isFirst, isLast, onEdit, onChange,
}: {
  courseId: string; sectionId: string; lesson: EditorLesson; isFirst: boolean; isLast: boolean; onEdit: () => void; onChange: () => void;
}) {
  const [pending, start] = useTransition();
  const Icon = TYPE_ICON[lesson.type];
  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); onChange(); });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-card/40 px-3 py-2.5">
      <Icon className="size-[18px] shrink-0 text-brand" />
      <span className="flex-1 truncate text-sm text-foreground">{lesson.title}</span>
      {lesson.isPreview && <Badge variant="gold">Preview</Badge>}
      <span className="hidden text-[0.7rem] uppercase tracking-wide text-muted-foreground sm:inline">{lesson.type}</span>
      <button disabled={isFirst || pending} onClick={() => act(() => moveLesson(lesson.id, sectionId, courseId, "up"))} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="size-4" /></button>
      <button disabled={isLast || pending} onClick={() => act(() => moveLesson(lesson.id, sectionId, courseId, "down"))} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="size-4" /></button>
      <button onClick={onEdit} className="text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="size-4" /></button>
      <button onClick={() => act(() => deleteLesson(lesson.id, courseId))} className="text-muted-foreground hover:text-red-400" title="Delete"><Trash2 className="size-4" /></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
function LessonForm({
  courseId, sectionId, lesson, onDone, onCancel,
}: {
  courseId: string; sectionId: string; lesson?: EditorLesson; onDone: () => void; onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  const [type, setType] = useState<LessonType>(lesson?.type ?? "VIDEO");
  const [isPreview, setIsPreview] = useState(lesson?.isPreview ?? false);
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [provider, setProvider] = useState<VideoProvider>(lesson?.videoProvider ?? "YOUTUBE");
  const [videoId, setVideoId] = useState(lesson?.videoId ?? "");
  const [durationMin, setDurationMin] = useState(lesson?.durationSec ? String(Math.round(lesson.durationSec / 60)) : "");
  const [contentUrl, setContentUrl] = useState(lesson?.contentUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(lesson?.contentUrl ? "Current file attached" : null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const url = await uploadLessonFile(file);
      setContentUrl(url);
      setUploadName(file.name);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  const [textContent, setTextContent] = useState(lesson?.textContent ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!title.trim()) { setError("Lesson needs a title."); return; }
    if (type === "VIDEO" && !videoId.trim()) { setError("Paste the YouTube/Vimeo video ID."); return; }
    setError(null);
    const input: LessonInput = {
      title, type, isPreview,
      videoProvider: provider, videoId,
      durationMin: durationMin ? Number(durationMin) : null,
      contentUrl, textContent,
    };
    start(async () => {
      const res = lesson
        ? await updateLesson(lesson.id, courseId, input)
        : await createLesson(courseId, sectionId, input);
      if (res.ok) onDone();
      else setError(res.error ?? "Could not save.");
    });
  };

  return (
    <div className="rounded-xl border border-brand/25 bg-brand/[0.04] p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label>Lesson title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Newton's second law" autoFocus className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LessonType)}
            className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none"
          >
            <option value="VIDEO">Video</option>
            <option value="PDF">PDF / Document</option>
            <option value="TEXT">Text</option>
            <option value="QUIZ">Quiz</option>
          </select>
        </div>
      </div>

      {type === "VIDEO" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as VideoProvider)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none"
            >
              <option value="YOUTUBE">YouTube</option>
              <option value="VIMEO">Vimeo</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>YouTube / Vimeo link (or ID)</Label>
            <Input value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="Paste a YouTube or Vimeo link" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (min)</Label>
            <Input value={durationMin} onChange={(e) => setDurationMin(e.target.value)} inputMode="numeric" placeholder="12" className="h-10" />
          </div>
        </div>
      )}

      {type === "PDF" && (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label>Upload a file (PDF or Word)</Label>
            <div className="flex items-center gap-3">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-4 text-sm text-foreground transition-colors hover:border-brand/40">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {uploading ? "Uploading…" : "Choose file"}
                <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={onPickFile} disabled={uploading} />
              </label>
              {uploadName && !uploadErr && (
                <span className="inline-flex items-center gap-1.5 truncate text-xs text-gold"><Check className="size-3.5" /> {uploadName}</span>
              )}
            </div>
            {uploadErr && <p className="text-xs text-red-400">{uploadErr}</p>}
            <p className="text-[0.7rem] text-muted-foreground">PDF, DOC or DOCX · up to 50 MB.</p>
          </div>
          <div className="space-y-1.5">
            <Label>…or paste a link</Label>
            <Input value={contentUrl} onChange={(e) => { setContentUrl(e.target.value); setUploadName(e.target.value ? "Link set" : null); }} placeholder="https://…/notes.pdf" className="h-10" />
          </div>
        </div>
      )}

      {type === "TEXT" && (
        <div className="mt-3 space-y-1.5">
          <Label>Text content</Label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="size-4 accent-[hsl(var(--brand))]" />
          Free preview (viewable before enrolling)
        </label>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-red-400">{error}</span>}
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : lesson ? "Save lesson" : "Add lesson"}
          </Button>
        </div>
      </div>
    </div>
  );
}
