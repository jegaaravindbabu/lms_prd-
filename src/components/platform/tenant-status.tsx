"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Pause, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setTenantStatus } from "@/app/platform/actions";
import type { TenantStatus } from "@prisma/client";

export function TenantStatusControls({ tenantId, status }: { tenantId: string; status: TenantStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const change = (next: TenantStatus) => start(async () => { await setTenantStatus(tenantId, next); router.refresh(); });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "ACTIVE" && (
        <Button size="sm" onClick={() => change("ACTIVE")} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <><Play className="size-4" /> Activate</>}
        </Button>
      )}
      {status === "ACTIVE" && (
        <Button size="sm" variant="outline" onClick={() => change("SUSPENDED")} disabled={pending}>
          <Pause className="size-4" /> Suspend
        </Button>
      )}
      {status !== "CANCELLED" && (
        <Button size="sm" variant="ghost" onClick={() => change("CANCELLED")} disabled={pending} className="text-muted-foreground hover:text-red-400">
          <Ban className="size-4" /> Cancel
        </Button>
      )}
    </div>
  );
}
