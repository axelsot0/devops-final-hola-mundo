"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { createAccountAction } from "@/modules/accounts/actions";
import type { BankDTO } from "@/modules/banks/service";
import { useDialogAction } from "@/lib/use-dialog-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FieldError,
  FormMessage,
  FormRow,
  SubmitButton,
} from "@/components/shared/form-bits";

export function ConnectAccountDialog({ banks }: { banks: BankDTO[] }) {
  const [open, setOpen] = useState(false);
  const { state, formAction } = useDialogAction(createAccountAction, () =>
    setOpen(false),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Conectar cuenta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar una cuenta</DialogTitle>
          <DialogDescription>
            Vincula el correo donde recibes las notificaciones de tu banco.
            Detectaremos automáticamente las transacciones de sus mensajes.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {!state.ok && <FormMessage state={state} />}
          <FormRow>
            <Label htmlFor="bankId">Entidad bancaria</Label>
            <Select name="bankId" required>
              <SelectTrigger id="bankId">
                <SelectValue placeholder="Selecciona tu banco" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: bank.color ?? "#3E9B94" }}
                      />
                      {bank.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError state={state} name="bankId" />
          </FormRow>
          <FormRow>
            <Label htmlFor="account-email">Correo electrónico asociado</Label>
            <Input
              id="account-email"
              name="email"
              type="email"
              placeholder="usuario@gmail.com"
              required
            />
            <FieldError state={state} name="email" />
          </FormRow>
          <FormRow>
            <Label htmlFor="nickname">
              Nombre personalizado{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="nickname"
              name="nickname"
              placeholder="Cuenta principal"
              maxLength={50}
            />
            <FieldError state={state} name="nickname" />
          </FormRow>
          <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
            Modo demostración: la bandeja de correo se simula con mensajes de
            ejemplo. En producción se conectaría con la Gmail API mediante
            OAuth 2.0.
          </p>
          <SubmitButton className="w-full">Conectar cuenta</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
