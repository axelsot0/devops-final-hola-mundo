"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Loader2, RefreshCw, Share2, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  generateInvitationAction,
  revokeInvitationAction,
} from "@/modules/invitations/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/shared/confirm-button";

export function InvitationCard({
  groupId,
  token,
  groupName,
  baseUrl,
}: {
  groupId: string;
  token: string | null;
  groupName: string;
  /** Origen de la app resuelto en el servidor, para armar el link completo */
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const url = token ? `${baseUrl}/invitacion/${token}` : null;

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateInvitationAction(groupId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No pudimos copiar el link. Cópialo manualmente.");
    }
  }

  async function handleShare() {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Únete a ${groupName} en Planea`,
          text: `Te invito al grupo "${groupName}" para que ahorremos juntos.`,
          url,
        });
      } catch {
        // El usuario canceló el diálogo de compartir
      }
    } else {
      handleCopy();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="size-4.5 text-primary" />
          Invitar personas
        </CardTitle>
        <CardDescription>
          Comparte este link para que se unan al grupo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {url ? (
          <>
            <div className="flex gap-2">
              <Input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="font-mono text-xs"
                aria-label="Link de invitación"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copiar link"
              >
                {copied ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" className="flex-1" onClick={handleShare}>
                <Share2 /> Compartir
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleGenerate}
                disabled={pending}
              >
                {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                Generar nuevo
              </Button>
              <ConfirmButton
                title="¿Revocar el link de invitación?"
                description="Quien tenga el link ya no podrá unirse al grupo. Puedes generar uno nuevo cuando quieras."
                confirmLabel="Revocar"
                action={() => revokeInvitationAction(groupId)}
              >
                <Button variant="outline" className="text-destructive sm:flex-1">
                  <XCircle /> Revocar
                </Button>
              </ConfirmButton>
            </div>
            <p className="text-xs text-muted-foreground">
              Al generar uno nuevo, el link anterior deja de funcionar.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              No hay un link activo. Genera uno para invitar personas al grupo.
            </p>
            <Button onClick={handleGenerate} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
              Generar link de invitación
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
