import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre completo."),
  email: z.email("Correo electrónico inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const loginSchema = z.object({
  email: z.email("Correo electrónico inválido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Correo electrónico inválido."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre completo."),
  image: z
    .union([z.literal(""), z.url("Debe ser una URL válida.")])
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual."),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
});
