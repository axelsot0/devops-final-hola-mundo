/** Resultado estándar de los server actions usados con useActionState. */
export interface ActionState {
  ok: boolean;
  /** Mensaje de error general (mostrado en la parte superior del formulario) */
  error?: string;
  /** Errores por campo, clave = nombre del campo */
  fieldErrors?: Record<string, string[]>;
  /** Mensaje de éxito */
  message?: string;
  /** Datos extra que la UI pueda necesitar (p. ej. link de restablecimiento en demo) */
  data?: Record<string, string>;
}

export const initialActionState: ActionState = { ok: false };

export function fromZodError(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
}
