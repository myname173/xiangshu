import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      suppressHydrationWarning
      className={cn(
        "flex h-11 w-full rounded-md bg-card px-3 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--color-border)] transition-[box-shadow] duration-150 placeholder:text-muted-foreground/80 focus-visible:shadow-[inset_0_0_0_2px_var(--color-primary)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
