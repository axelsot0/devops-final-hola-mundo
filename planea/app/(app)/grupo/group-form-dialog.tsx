"use client";

import { createGroupAction, updateGroupAction } from "@/modules/groups/actions";
import { useDialogAction } from "@/lib/use-dialog-action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

const EMOJIS = ["👥", "🏠", "✈️", "💑", "🎓", "🚗", "🎉", "💰"];

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: {
    id: string;
    name: string;
    description: string | null;
    emoji: string | null;
  } | null;
}

export function GroupFormDialog({ open, onOpenChange, group }: GroupFormDialogProps) {
  const isEdit = Boolean(group);
  const { state, formAction } = useDialogAction(
    isEdit ? updateGroupAction : createGroupAction,
    () => onOpenChange(false),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar grupo" : "Nuevo grupo"}</DialogTitle>
          <DialogDescription>
            Familia, pareja, roommates, un viaje… crea el espacio donde ahorrarán
            juntos.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {!state.ok && <FormMessage state={state} />}
          {group && <input type="hidden" name="groupId" value={group.id} />}

          <FormRow>
            <Label htmlFor="group-name">Nombre</Label>
            <Input
              id="group-name"
              name="name"
              defaultValue={group?.name ?? ""}
              placeholder="Viaje a Japón"
              maxLength={60}
              required
            />
            <FieldError state={state} name="name" />
          </FormRow>

          <FormRow>
            <Label htmlFor="group-description">
              Descripción{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="group-description"
              name="description"
              defaultValue={group?.description ?? ""}
              placeholder="¿Para qué crearon este grupo?"
              maxLength={200}
            />
          </FormRow>

          <FormRow>
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji, index) => (
                <label
                  key={emoji}
                  className="cursor-pointer rounded-xl border border-input bg-card p-2 text-xl transition-colors has-checked:border-primary has-checked:bg-accent"
                >
                  <input
                    type="radio"
                    name="emoji"
                    value={emoji}
                    defaultChecked={
                      group ? group.emoji === emoji : index === 0
                    }
                    className="sr-only"
                  />
                  {emoji}
                </label>
              ))}
            </div>
          </FormRow>

          <SubmitButton className="w-full">
            {isEdit ? "Guardar cambios" : "Crear grupo"}
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
