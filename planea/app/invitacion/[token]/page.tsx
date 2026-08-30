import type { Metadata } from "next";
import Link from "next/link";
import { Link2Off, Users } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInvitationPreview } from "@/modules/invitations/service";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInvitationButton } from "./accept-button";

export const metadata: Metadata = { title: "Invitación · Planea" };

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invitation, session] = await Promise.all([
    getInvitationPreview(token),
    auth(),
  ]);

  const nextUrl = `/invitacion/${token}`;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-secondary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 size-96 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLockup />
        </div>

        {!invitation ? (
          <Card>
            <CardHeader className="items-center text-center">
              <span className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Link2Off className="size-7" />
              </span>
              <CardTitle className="text-xl">Invitación no válida</CardTitle>
              <CardDescription>
                Este link fue revocado o ya no existe. Pide al administrador del
                grupo que te envíe uno nuevo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Ir a Planea</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <InvitationContent
            invitation={invitation}
            userId={session?.user?.id}
            nextUrl={nextUrl}
          />
        )}
      </div>
    </div>
  );
}

async function InvitationContent({
  invitation,
  userId,
  nextUrl,
}: {
  invitation: NonNullable<Awaited<ReturnType<typeof getInvitationPreview>>>;
  userId?: string;
  nextUrl: string;
}) {
  const alreadyMember = userId
    ? Boolean(
        await db.groupMember.findUnique({
          where: { groupId_userId: { groupId: invitation.groupId, userId } },
        }),
      )
    : false;

  return (
    <Card>
      <CardHeader className="text-center">
        <span className="mx-auto mb-2 flex size-16 items-center justify-center rounded-2xl bg-accent text-3xl">
          {invitation.groupEmoji ?? "👥"}
        </span>
        <CardTitle className="text-xl">{invitation.groupName}</CardTitle>
        <CardDescription>
          {invitation.invitedByName} te invita a unirte a este grupo para ahorrar
          juntos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {invitation.groupDescription && (
          <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-center text-sm text-muted-foreground">
            {invitation.groupDescription}
          </p>
        )}
        <p className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-4" />
          {invitation.memberCount}{" "}
          {invitation.memberCount === 1 ? "miembro" : "miembros"}
        </p>

        {alreadyMember ? (
          <>
            <p className="rounded-lg border border-success/30 bg-success/8 px-3 py-2.5 text-center text-sm text-success">
              Ya eres miembro de este grupo.
            </p>
            <Button asChild className="w-full">
              <Link href={`/grupo/${invitation.groupId}`}>Ir al grupo</Link>
            </Button>
          </>
        ) : userId ? (
          <>
            <AcceptInvitationButton token={invitation.token} />
            <p className="text-center text-xs text-muted-foreground">
              Al unirte, tus finanzas quedan privadas por defecto. Podrás decidir
              si compartirlas dentro del grupo.
            </p>
          </>
        ) : (
          <>
            <Button asChild size="lg" className="w-full">
              <Link href={`/registro?redirectTo=${encodeURIComponent(nextUrl)}`}>
                Crear cuenta y unirme
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href={`/login?redirectTo=${encodeURIComponent(nextUrl)}`}>
                Ya tengo cuenta
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
