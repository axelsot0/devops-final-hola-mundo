"use client";

import { useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { acceptInvitationAction } from "@/modules/invitations/actions";
import { Button } from "@/components/ui/button";

export function AcceptInvitationButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvitationAction(token);
      // Solo devuelve valor cuando falla; en éxito redirige.
      if (result && !result.ok) toast.error(result.error);
    });
  }

  return (
    <Button size="lg" className="w-full" onClick={handleAccept} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
      Unirme al grupo
    </Button>
  );
}
