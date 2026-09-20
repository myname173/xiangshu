import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      suppressHydrationWarning
      className={cn(
        "flex min-h-36 w-full rounded-md bg-card px-3 py-3 text-sm leading-relaxed text-foreground shadow-[inset_0_0_0_1px_var(--color-border)] transition-[box-shadow] duration-150 placeholder:text-muted-foreground/80 focus-visible:shadow-[inset_0_0_0_2px_var(--color-primary)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
