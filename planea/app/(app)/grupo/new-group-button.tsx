"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GroupFormDialog } from "./group-form-dialog";

export function NewGroupButton({
  variant = "default",
  label = "Crear grupo",
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
      <GroupFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
