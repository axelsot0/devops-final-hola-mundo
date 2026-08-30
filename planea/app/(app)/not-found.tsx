import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-card/50 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
        <Compass className="size-7" strokeWidth={1.8} />
      </span>
      <h2 className="mt-4 text-base font-semibold">No encontramos esta página</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Puede que el contenido se haya eliminado o que no tengas acceso a él.
      </p>
      <Button asChild className="mt-5">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
