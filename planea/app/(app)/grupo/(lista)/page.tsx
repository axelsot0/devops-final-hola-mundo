import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Eye, EyeOff, Users } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { listGroups } from "@/modules/groups/service";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NewGroupButton } from "../new-group-button";

export const metadata: Metadata = { title: "Grupos · Planea" };

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await listGroups(user.id);

  return (
    <>
      <PageHeader
        title="Grupos"
        description="Ahorren juntos: familia, pareja, roommates o un viaje."
      >
        {groups.length > 0 && <NewGroupButton />}
      </PageHeader>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no perteneces a ningún grupo"
          description="Crea un grupo para planear ahorros compartidos, o pide a alguien que te envíe su link de invitación."
        >
          <NewGroupButton label="Crear mi primer grupo" />
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/grupo/${group.id}`} className="group">
              <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-xl">
                  {group.emoji ?? "👥"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold leading-tight">
                      {group.name}
                    </h3>
                    {group.myRole === "ADMIN" && (
                      <Badge variant="secondary" className="shrink-0">
                        Admin
                      </Badge>
                    )}
                  </div>
                  {group.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {group.memberCount}{" "}
                      {group.memberCount === 1 ? "miembro" : "miembros"}
                    </span>
                    <span>
                      {group.activePlanCount}{" "}
                      {group.activePlanCount === 1 ? "plan activo" : "planes activos"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {group.myPrivacy === "SHARED" ? (
                        <>
                          <Eye className="size-3.5" /> Compartido
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3.5" /> Privado
                        </>
                      )}
                    </span>
                  </p>
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
