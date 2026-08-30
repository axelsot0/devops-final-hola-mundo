"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

export function SubmitButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function FieldError({
  state,
  name,
}: {
  state: ActionState;
  name: string;
}) {
  const errors = state.fieldErrors?.[name];
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive">{errors[0]}</p>;
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
        {state.error}
      </div>
    );
  }
  if (state.ok && state.message) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/8 px-3 py-2.5 text-sm text-success">
        {state.message}
      </div>
    );
  }
  return null;
}

export function FormRow({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}
