// ============================================================================
//  Owner-only CSV export of enrolled students  →  GET /api/admin/students/export
// ----------------------------------------------------------------------------
//  Returns a spreadsheet (CSV, opens directly in Excel / Google Sheets) with one
//  row per student in the current school. Owner-only: student data is sensitive.
// ============================================================================

import { getCurrentUser } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Escape one CSV cell: wrap in quotes and double any inner quotes. */
function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();

  // Owner-only. Anyone else gets a clean 403, not a redirect.
  if (!user) {
    return new Response("Sign in required.", { status: 401 });
  }
  if (user.role !== "OWNER") {
    return new Response("Only the academy owner can export student data.", { status: 403 });
  }

  const tenant = await getTenant();

  const rows = await withTenant(user.tenantId, async (tx) => {
    const memberships = await tx.membership.findMany({
      where: { role: "STUDENT" },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Active enrolments with course titles, grouped per student.
    const enrolments = await tx.enrollment.findMany({
      where: { status: "ACTIVE" },
      select: { userId: true, enrolledAt: true, course: { select: { title: true } } },
    });

    const byUser = new Map<string, { titles: string[]; count: number }>();
    for (const e of enrolments) {
      const entry = byUser.get(e.userId) ?? { titles: [], count: 0 };
      entry.count += 1;
      if (e.course?.title) entry.titles.push(e.course.title);
      byUser.set(e.userId, entry);
    }

    return memberships.map((m) => {
      const info = byUser.get(m.user.id) ?? { titles: [], count: 0 };
      return {
        name: m.user.name ?? "",
        email: m.user.email ?? "",
        phone: m.user.phone ?? "",
        coursesCount: info.count,
        courses: info.titles.join("; "),
        joined: m.createdAt,
      };
    });
  });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const header = ["Name", "Email", "Phone", "Courses Enrolled", "Enrolled Courses", "Joined"];
  const lines = [
    header.map(cell).join(","),
    ...rows.map((r) =>
      [r.name, r.email, r.phone, r.coursesCount, r.courses, fmtDate(r.joined)].map(cell).join(","),
    ),
  ];

  // Prepend a UTF-8 BOM so Excel renders ₹, accents and non-ASCII names correctly.
  const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";

  const slug = (tenant?.name ?? "students")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "students";
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${slug}-students-${today}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
