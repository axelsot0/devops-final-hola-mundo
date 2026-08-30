"use client";

import { useState } from "react";
import { LogOut, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { deleteGroupAction, leaveGroupAction } from "@/modules/groups/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { GroupFormDialog } from "../group-form-dialog";

interface GroupActionsProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    emoji: string | null;
  };
  isAdmin: boolean;
}

export function GroupActions({ group, isAdmin }: GroupActionsProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Opciones del grupo">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {isAdmin && (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil /> Editar grupo
            </DropdownMenuItem>
          )}
          <ConfirmButton
            title="¿Abandonar el grupo?"
            description={`Dejarás de ver los planes y metas de "${group.name}". Podrás volver si te invitan de nuevo.`}
            confirmLabel="Abandonar"
            action={() => leaveGroupAction(group.id)}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <LogOut /> Abandonar grupo
            </DropdownMenuItem>
          </ConfirmButton>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <ConfirmButton
                title={`¿Eliminar "${group.name}"?`}
                description="Se eliminarán el grupo, sus planes y el historial de aportes para todos los miembros. Esta acción no se puede deshacer."
                action={() => deleteGroupAction(group.id)}
              >
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 /> Eliminar grupo
                </DropdownMenuItem>
              </ConfirmButton>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <GroupFormDialog open={editOpen} onOpenChange={setEditOpen} group={group} />
    </>
  );
}
