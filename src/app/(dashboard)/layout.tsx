import { requireUser } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const tenant = await getTenant();
  const tenantName = tenant?.name ?? "Academy";

  return (
    <div className="luxe-bg grain relative min-h-screen">
      <Topbar tenantName={tenantName} logoUrl={tenant?.logoUrl} userName={user.name} role={user.role} />
      <div className="relative z-10 mx-auto flex max-w-7xl">
        <Sidebar role={user.role} />
        <main className="min-h-[calc(100vh-4rem)] flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
