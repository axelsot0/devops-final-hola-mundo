import { requireUser } from "@/lib/auth-helpers";
import { AutoSync } from "@/components/auto-sync";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * La sincronización automática habla con la Gmail API desde la ruta que el
 * usuario tenga abierta, y el límite por defecto de 10 s la cortaría.
 */
export const maxDuration = 60;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <AutoSync />
      <Sidebar user={user} />
      <MobileHeader user={user} />
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-8 md:pb-12 md:pt-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
