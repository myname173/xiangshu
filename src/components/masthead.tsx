import { History, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

function SealMark() {
  return (
    <svg
      viewBox="0 0 40 40"
      className="size-10 shrink-0 text-primary"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="8" fill="currentColor" />
      <rect x="11" y="10" width="4" height="20" fill="var(--color-primary-foreground)" />
      <rect x="18" y="10" width="13" height="2.2" fill="var(--color-primary-foreground)" />
      <rect x="18" y="16" width="13" height="2.2" fill="var(--color-primary-foreground)" opacity="0.85" />
      <rect x="18" y="22" width="9" height="2.2" fill="var(--color-primary-foreground)" opacity="0.7" />
      <rect x="18" y="28" width="11" height="2.2" fill="var(--color-primary-foreground)" opacity="0.55" />
    </svg>
  );
}

export function Masthead({
  onHistory,
  onAbout,
  historyCount,
}: {
  onHistory: () => void;
  onAbout: () => void;
  historyCount: number;
}) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <SealMark />
          <div>
            <p className="font-display text-xl leading-none font-medium tracking-tight text-foreground">
              项述
            </p>
            <p className="mt-1 text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Project narrative
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAbout}
            className="text-muted-foreground"
            aria-label="写法"
          >
            <Info />
            <span className="hidden sm:inline">写法</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHistory}
            className="text-muted-foreground"
            aria-label="底稿"
          >
            <History />
            <span className="hidden sm:inline">底稿</span>
            {historyCount > 0 && (
              <span className="tabular-nums text-foreground">{historyCount}</span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
