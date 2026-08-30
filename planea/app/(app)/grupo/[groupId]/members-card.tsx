"use client";

import { useTransition } from "react";
import { Eye, EyeOff, MoreVertical, ShieldMinus, ShieldPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

import {
  removeMemberAction,
  updateMemberRoleAction,
} from "@/modules/groups/actions";
import type { GroupMemberDTO } from "@/modules/groups/service";
import type { MemberFinancesDTO } from "@/modules/groups/service";
import { formatMoney, initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmButton } from "@/components/shared/confirm-button";

interface MembersCardProps {
  groupId: string;
  members: GroupMemberDTO[];
  finances: MemberFinancesDTO[];
  viewerId: string;
  viewerIsAdmin: boolean;
  membershipIds: Record<string, string>;
}

export function MembersCard({
  groupId,
  members,
  finances,
  viewerId,
  viewerIsAdmin,
  membershipIds,
}: MembersCardProps) {
  const [, startTransition] = useTransition();
  const financeByUser = new Map(finances.map((f) => [f.userId, f]));

  function handleRoleChange(memberUserId: string, role: "ADMIN" | "MEMBER") {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("memberId", membershipIds[memberUserId] ?? "");
      formData.set("role", role);
      const result = await updateMemberRoleAction(formData);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Miembros ({members.length})</CardTitle>
        <CardDescription>
          Solo ves las finanzas de quienes decidieron compartirlas en este grupo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/70">
          {members.map((member) => {
            const finance = financeByUser.get(member.userId);
            const isSelf = member.userId === viewerId;
            return (
              <li key={member.userId} className="flex items-center gap-3 py-3">
                <Avatar>
                  {member.image && <AvatarImage src={member.image} alt="" />}
                  <AvatarFallback>{initials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">
                      {member.name}
                      {isSelf && (
                        <span className="text-muted-foreground"> (tú)</span>
                      )}
                    </span>
                    {member.role === "ADMIN" && (
                      <Badge variant="secondary" className="shrink-0">
                        Admin
                      </Badge>
                    )}
                  </p>
                  {finance?.visible && finance.available !== null ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Disponible: {formatMoney(finance.available)} · Capacidad de
                      ahorro: {formatMoney(finance.savingCapacity ?? 0)}
                    </p>
                  ) : (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <EyeOff className="size-3.5" />
                      Finanzas privadas
                    </p>
                  )}
                </div>

                {finance?.visible && !isSelf && (
                  <Eye className="size-4 shrink-0 text-muted-foreground" />
                )}

                {viewerIsAdmin && !isSelf && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Opciones de ${member.name}`}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role === "MEMBER" ? (
                        <DropdownMenuItem
                          onSelect={() => handleRoleChange(member.userId, "ADMIN")}
                        >
                          <ShieldPlus /> Hacer administrador
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => handleRoleChange(member.userId, "MEMBER")}
                        >
                          <ShieldMinus /> Quitar administrador
                        </DropdownMenuItem>
                      )}
                      <ConfirmButton
                        title={`¿Eliminar a ${member.name} del grupo?`}
                        description="Dejará de ver los planes y metas compartidas del grupo."
                        action={() => removeMemberAction(groupId, member.userId)}
                      >
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <UserMinus /> Eliminar del grupo
                        </DropdownMenuItem>
                      </ConfirmButton>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
