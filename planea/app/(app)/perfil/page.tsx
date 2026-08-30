import type { Metadata } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "Perfil · Planea" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Mi perfil" description="Gestiona tu cuenta y seguridad." />

      <div className="mb-5 flex items-center gap-4">
        <Avatar className="size-16">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfileForm user={user} />
        <PasswordForm />
      </div>
    </>
  );
}
