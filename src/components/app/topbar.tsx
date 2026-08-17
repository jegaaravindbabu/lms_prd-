import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student",
  SUPPORT: "Support",
};

export function Topbar({
  tenantName,
  logoUrl,
  userName,
  role,
}: {
  tenantName: string;
  logoUrl?: string | null;
  userName: string | null;
  role: Role;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-background/70 px-5 backdrop-blur-xl">
      <Link href="/dashboard">
        <Logo name={tenantName} logoUrl={logoUrl} />
      </Link>

      <div className="flex items-center gap-4">
        <Badge variant="muted" className="hidden sm:inline-flex">
          {ROLE_LABEL[role]}
        </Badge>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight text-foreground">{userName ?? "Member"}</p>
            <p className="text-[0.7rem] leading-tight text-muted-foreground">{tenantName}</p>
          </div>
          <div className="grid size-10 place-items-center rounded-full bg-brand/15 text-sm font-medium text-brand ring-1 ring-inset ring-white/10">
            {initials(userName)}
          </div>
        </div>
      </div>
    </header>
  );
}
