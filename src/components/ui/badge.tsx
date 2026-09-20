import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: "default" | "pine" | "warn" | "ok" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "default" && "bg-muted text-muted-foreground",
        tone === "pine" && "bg-accent text-accent-foreground",
        tone === "warn" && "bg-destructive/10 text-destructive",
        tone === "ok" && "bg-accent text-sage",
        className,
      )}
      {...props}
    />
  );
}
