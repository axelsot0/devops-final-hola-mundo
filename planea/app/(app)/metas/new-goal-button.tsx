"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GoalFormDialog } from "./goal-form-dialog";

export function NewGoalButton({
  variant = "default",
  label = "Nueva meta",
}: {
  variant?: "default" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus /> {label}
      </Button>
      <GoalFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
