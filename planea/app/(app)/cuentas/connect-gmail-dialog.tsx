"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import type { BankDTO } from "@/modules/banks/service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormRow } from "@/components/shared/form-bits";

/**
 * Conectar = autorizar Gmail. El correo no se escribe a mano: lo aporta el
 * propio buzón que el usuario aprueba en Google, así nadie puede conectar
 * una dirección que no controla.
 *
 * El formulario es un GET normal hacia la ruta de arranque de OAuth: la
 * navegación tiene que salir del navegador para llegar a Google.
 */
export function ConnectGmailDialog({ banks }: { banks: BankDTO[] }) {
  const [open, setOpen] = useState(false);
  const [bankId, setBankId] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Conectar Gmail
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar tu Gmail</DialogTitle>
          <DialogDescription>
            Elige el banco que te envía las notificaciones y autoriza el
            acceso de solo lectura a tu correo. Planea únicamente busca los
            mensajes de ese banco.
          </DialogDescription>
        </DialogHeader>
        <form
          action="/api/gmail/oauth/start"
          method="GET"
          className="flex flex-col gap-4"
        >
          <FormRow>
            <Label htmlFor="bankId">Entidad bancaria</Label>
            <Select
              name="bankId"
              required
              value={bankId}
              onValueChange={setBankId}
            >
              <SelectTrigger id="bankId">
                <SelectValue placeholder="Selecciona tu banco" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
            Te llevaremos a Google para que apruebes el permiso de lectura.
            Puedes revocarlo cuando quieras desde tu cuenta de Google.
          </p>
          <Button type="submit" className="w-full" disabled={!bankId}>
            Continuar con Google
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
