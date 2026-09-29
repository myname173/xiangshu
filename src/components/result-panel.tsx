import { Check, Copy, Download, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LatexTemplate, ResumeResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const TEMPLATES: { value: LatexTemplate; label: string }[] = [
  { value: "billryan", label: "Billryan" },
  { value: "awesomeCv", label: "Awesome-CV" },
  { value: "moderncv", label: "moderncv" },
  { value: "itemize", label: "通用 itemize" },
];

function copyText(label: string, text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(`已复制${label}`),
    () => toast.error("复制失败，请手动选择文本"),
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultPanel({
  result,
  template,
  onTemplate,
}: {
  result: ResumeResult | null;
  template: LatexTemplate;
  onTemplate: (t: LatexTemplate) => void;
}) {
  const [tab, setTab] = useState("preview");

  if (!result) {
    return (
      <div className="paper-sheet relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-xl p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-8 top-16 opacity-[0.18]">
          <p className="font-display text-3xl tracking-tight">项目经历</p>
          <div className="mt-6 space-y-3">
            <div className="h-3 w-2/3 rounded-sm bg-foreground" />
            <div className="h-3 w-full rounded-sm bg-foreground" />
            <div className="h-3 w-5/6 rounded-sm bg-foreground" />
            <div className="h-3 w-11/12 rounded-sm bg-foreground" />
          </div>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Output
          </p>
          <h2 className="font-display mt-2 text-2xl tracking-tight">尚未成稿</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            选定仓库、贴上岗位 JD，生成后这里会给出预览、可编译的 LaTeX 与 Markdown。
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          量化数字若仓库中不存在，会标成待填，而不是编造。
        </p>
      </div>
    );
  }

  const tex = result.latex[template];

  return (
    <div className="paper-sheet rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            Output
          </p>
          <h2 className="font-display mt-1 text-2xl tracking-tight">
            {result.projectTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[result.role, result.organization, result.period]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              copyText(
                tab === "md" ? " Markdown" : tab === "tex" ? " LaTeX" : "要点",
                tab === "md"
                  ? result.markdown
                  : tab === "tex"
                    ? tex
                    : result.bullets.map((b) => `• ${b.text}`).join("\n"),
              )
            }
          >
            <Copy />
            复制
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadText(
                `${result.projectTitle.replace(/\s+/g, "-")}.tex`,
                result.latex.standalone,
              )
            }
          >
            <Download />
            完整 .tex
          </Button>
        </div>
      </div>

      {result.stack.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {result.stack.map((s) => (
            <Badge key={s} tone="pine">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {result.engine === "rules" && (
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          大模型额度暂不可用，本段按仓库证据与 JD 关键词起草。请核对口径并补上真实数字后再投递。
        </p>
      )}

      {result.oneLiner && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          {result.oneLiner}
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="preview">预览</TabsTrigger>
          <TabsTrigger value="tex">LaTeX</TabsTrigger>
          <TabsTrigger value="md">Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <ol className="space-y-4">
            {result.bullets.map((b, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-relaxed">{b.text}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {b.needsQuantification && (
                      <Badge tone="warn">
                        <TriangleAlert className="mr-1 size-3" />
                        待量化
                      </Badge>
                    )}
                    {b.keywords.map((k) => (
                      <Badge key={k}>{k}</Badge>
                    ))}
                  </div>
                  {b.interviewQuestion && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      可能追问：{b.interviewQuestion}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="tex">
          <div className="mb-3 flex flex-wrap gap-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onTemplate(t.value)}
                className={cn(
                  "h-8 rounded-sm px-3 text-xs font-medium transition-colors",
                  template === t.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <pre className="max-h-[420px] overflow-auto rounded-md bg-primary p-4 font-mono text-[12px] leading-relaxed text-primary-foreground">
            {tex}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            片段按对应简历类文件排版，特殊字符已转义。完整文档走 XeLaTeX。
          </p>
        </TabsContent>

        <TabsContent value="md">
          <pre className="max-h-[420px] overflow-auto rounded-md bg-muted p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
            {result.markdown}
          </pre>
        </TabsContent>
      </Tabs>

      {result.jdHits.length > 0 && (
        <section className="mt-6 border-t border-border pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            JD 关键词覆盖
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.jdHits.map((h) => (
              <Badge key={h.keyword} tone={h.covered ? "ok" : "warn"}>
                {h.covered && <Check className="mr-1 size-3" />}
                {h.keyword}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {(result.gaps.length > 0 || result.interviewPrep.length > 0) && (
        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          {result.gaps.length > 0 && (
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                证据缺口
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
                {result.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {result.interviewPrep.length > 0 && (
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                面试准备
              </p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
                {result.interviewPrep.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {result.researchNotes.length > 0 && (
        <section className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            检索到的写法要点
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            {result.researchNotes.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
