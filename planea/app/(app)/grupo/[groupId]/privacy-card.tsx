"use client";

import { useActionState, useEffect, useRef } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { updatePrivacyAction } from "@/modules/groups/actions";
import { initialActionState } from "@/lib/action-state";
import type { PrivacyMode } from "@/lib/generated/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { FormMessage } from "@/components/shared/form-bits";

/**
 * Control de privacidad financiera dentro del grupo.
 * La configuración es POR GRUPO: un usuario puede compartir sus finanzas con
 * su familia y mantenerlas privadas en el grupo de un viaje con amigos.
 */
export function PrivacyCard({
  groupId,
  privacy,
  groupName,
}: {
  groupId: string;
  privacy: PrivacyMode;
  groupName: string;
}) {
  const [state, formAction] = useActionState(updatePrivacyAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const privacyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  const shared = privacy === "SHARED";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4.5 text-primary" />
          Privacidad en este grupo
        </CardTitle>
        <CardDescription>
          Decides qué ven los demás miembros de {groupName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!state.ok && <FormMessage state={state} />}
        <form ref={formRef} action={formAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <input
            ref={privacyRef}
            type="hidden"
            name="privacy"
            defaultValue={shared ? "SHARED" : "PRIVATE"}
          />
          <div className="flex items-start gap-3 rounded-xl border border-input bg-card p-3">
            <span className="mt-0.5 text-primary">
              {shared ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {shared ? "Finanzas compartidas" : "Finanzas privadas"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {shared
                  ? "Los miembros del grupo pueden ver tus ingresos, gastos y transacciones."
                  : "Nadie ve tus montos. El sistema los usa internamente para calcular los planes, pero sin mostrar tus valores."}
              </p>
            </div>
            <Switch
              checked={shared}
              onCheckedChange={(checked) => {
                if (privacyRef.current) {
                  privacyRef.current.value = checked ? "SHARED" : "PRIVATE";
                }
                formRef.current?.requestSubmit();
              }}
              aria-label="Compartir mis finanzas con este grupo"
            />
          </div>
        </form>
        <p className="text-xs text-muted-foreground">
          Puedes cambiar esta configuración cuando quieras y es independiente en
          cada grupo.
        </p>
      </CardContent>
    </Card>
  );
}
