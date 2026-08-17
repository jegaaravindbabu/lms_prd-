"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  BarChart3,
  Library,
  ClipboardList,
  FileQuestion,
  Users,
  CreditCard,
  Tag,
  Globe,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type Item = { href: string; label: string; icon: React.ElementType; roles?: Role[] };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/progress", label: "Progress", icon: GraduationCap },
  { href: "/dashboard/tests", label: "Tests", icon: ClipboardList },
  { href: "/admin", label: "Console", icon: BarChart3, roles: ["OWNER", "ADMIN"] },
  { href: "/admin/courses", label: "Manage Courses", icon: Library, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
  { href: "/admin/questions", label: "Question Bank", icon: FileQuestion, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
  { href: "/admin/tests", label: "Manage Tests", icon: ClipboardList, roles: ["OWNER", "ADMIN", "INSTRUCTOR"] },
  { href: "/admin/students", label: "Students", icon: Users, roles: ["OWNER", "ADMIN", "SUPPORT"] },
  { href: "/admin/coupons", label: "Coupons", icon: Tag, roles: ["OWNER", "ADMIN"] },
  { href: "/admin/billing", label: "Billing", icon: CreditCard, roles: ["OWNER"] },
  { href: "/admin/domain", label: "Domain", icon: Globe, roles: ["OWNER"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["OWNER", "ADMIN"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const visible = ITEMS.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/8 px-4 py-6 lg:flex">
      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {visible.map((item) => {
          // "/dashboard" and "/admin" are parents of other items, so only mark
          // them active on an exact match; deeper items match their subtree.
          const exactOnly = item.href === "/dashboard" || item.href === "/admin";
          const active = exactOnly
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-white/[0.04] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand shadow-[0_0_12px_hsl(var(--brand))]" />
              )}
              <Icon className={cn("size-[18px]", active && "text-brand")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-gold" />
          <span>Isolated by RLS</span>
        </div>
        <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground/70">
          Your data is sealed to this school at the database layer.
        </p>
      </div>
    </aside>
  );
}
