"use server";

import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/lib/auth";
import { requireUserId } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { fromZodError, type ActionState } from "@/lib/action-state";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./schemas";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "Ya existe una cuenta con este correo. Inicia sesión.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.user.create({
    data: { name: parsed.data.name, email, passwordHash },
  });

  // Autenticar inmediatamente después del registro
  const redirectTo = (formData.get("redirectTo") as string) || "/";
  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo,
  });
  return { ok: true };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const redirectTo = (formData.get("redirectTo") as string) || "/";
  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Correo o contraseña incorrectos." };
    }
    throw error; // NEXT_REDIRECT en caso de éxito
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  // Nunca revelar si el correo existe o no
  const message =
    "Si el correo está registrado, generamos un enlace para restablecer la contraseña.";

  if (!user) return { ok: true, message };

  const token = crypto.randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // Sin servicio de correo configurado (modo demo), devolvemos el enlace
  // para que el usuario pueda continuar el flujo. En producción este enlace
  // se enviaría por correo electrónico.
  return {
    ok: true,
    message,
    data: { resetUrl: `/restablecer/${token}` },
  };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      ok: false,
      error: "El enlace no es válido o ya expiró. Solicita uno nuevo.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/login?reset=1");
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  await db.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      image: parsed.data.image ? parsed.data.image : null,
    },
  });
  revalidatePath("/perfil");
  return { ok: true, message: "Perfil actualizado." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "La contraseña actual no es correcta." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true, message: "Contraseña actualizada." };
}
