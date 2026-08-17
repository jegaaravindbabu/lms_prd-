import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import { initials } from "@/lib/utils";

export function PlatformTopbar({ adminName }: { adminName: string | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-background/70 px-5 backdrop-blur-xl">
      <Link href="/platform" className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-brand/15 ring-1 ring-inset ring-white/10">
          <Building2 className="size-5 text-brand" />
        </span>
        <div>
          <div className="font-display text-base leading-tight tracking-tight text-luxe">Platform Console</div>
          <div className="text-[0.7rem] leading-tight text-muted-foreground">All schools</div>
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm leading-tight text-foreground">{adminName ?? "Operator"}</p>
          <p className="text-[0.7rem] leading-tight text-muted-foreground">Platform admin</p>
        </div>
        <div className="grid size-10 place-items-center rounded-full bg-brand/15 text-sm font-medium text-brand ring-1 ring-inset ring-white/10">
          {initials(adminName)}
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="grid size-9 place-items-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:text-foreground" title="Sign out">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
