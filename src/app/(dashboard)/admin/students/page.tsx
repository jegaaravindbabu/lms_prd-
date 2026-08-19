import { Users, ShieldCheck, Phone, Mail } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Students" };

function initials(name?: string | null, phone?: string) {
  if (name && name.trim()) {
    const w = name.trim().split(/\s+/);
    return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? "")).toUpperCase() || "S";
  }
  return phone ? phone.slice(-2) : "S";
}

export default async function StudentsPage() {
  const user = await requireRole(["OWNER", "ADMIN", "SUPPORT"]);
  const tenant = await getTenant();

  const students = await withTenant(user.tenantId, async (tx) => {
    // Everyone who is a STUDENT in this school.
    const memberships = await tx.membership.findMany({
      where: { role: "STUDENT" },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Active enrollment counts, grouped by student.
    const grouped = await tx.enrollment.groupBy({
      by: ["userId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    });
    const countByUser = new Map(grouped.map((g) => [g.userId, g._count._all]));

    return memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      phone: m.user.phone,
      email: m.user.email,
      joined: m.createdAt,
      courses: countByUser.get(m.user.id) ?? 0,
    }));
  });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><ShieldCheck className="size-3.5 text-gold" /> {tenant?.name ?? "Your school"}</span>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Students</h1>
          <p className="mt-2 text-muted-foreground">Everyone enrolled in your academy.</p>
        </div>
        <Badge variant="muted"><Users className="size-3.5" /> {students.length} total</Badge>
      </div>

      {students.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-muted-foreground">No students yet. Share your courses and enrolments will appear here.</p>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          {/* header row (desktop) */}
          <div className="hidden grid-cols-[1fr_160px_120px_120px] gap-4 border-b border-white/8 px-5 py-3 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:grid">
            <span>Student</span><span>Phone</span><span>Courses</span><span>Joined</span>
          </div>
          {students.map((s, i) => (
            <div
              key={s.id}
              className={`grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1fr_160px_120px_120px] sm:items-center sm:gap-4 ${i > 0 ? "border-t border-white/6" : ""}`}
            >
              {/* name + email */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                  {initials(s.name, s.phone)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{s.name ?? "Unnamed student"}</p>
                  {s.email && (
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="size-3" /> {s.email}
                    </p>
                  )}
                </div>
              </div>
              {/* phone */}
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="size-3.5 sm:hidden" /> {s.phone}
              </p>
              {/* courses */}
              <p className="text-sm text-foreground">
                <span className="sm:hidden text-muted-foreground">Courses: </span>{s.courses}
              </p>
              {/* joined */}
              <p className="text-sm text-muted-foreground">
                <span className="sm:hidden">Joined: </span>{fmtDate(s.joined)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
