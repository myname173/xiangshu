import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Github, Loader2, PenLine, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Masthead } from "@/components/masthead";
import { ResultPanel } from "@/components/result-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { fetchBriefFn, listReposFn } from "@/lib/github.functions";
import { generateResumeFn } from "@/lib/generate.functions";
import { parseRepoRef } from "@/lib/repo-ref";
import {
  SAMPLE_JD,
  SAMPLE_NOTES,
  SAMPLE_ROLE_TITLE,
  SAMPLE_USERNAME,
} from "@/lib/samples";
import {
  defaultForm,
  loadForm,
  loadHistory,
  pushHistory,
  saveForm,
  type PersistedForm,
} from "@/lib/storage";
import type {
  HistoryItem,
  LatexTemplate,
  ProjectBrief,
  RepoSummary,
  ResumeResult,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const TOKEN_KEY = "xiangshu-gh-token";

const STAGES = [
  "整理仓库证据…",
  "检索岗位写法…",
  "对齐 JD 撰写要点…",
  "转义并排版 LaTeX…",
];

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 rounded-sm px-3 text-xs font-medium transition-colors duration-150",
            value === o.value
              ? "bg-card text-foreground shadow-[0_0_0_1px_var(--color-border)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Workspace() {
  const [form, setForm] = useState<PersistedForm>(defaultForm);
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [repoQuery, setRepoQuery] = useState("");
  const [profile, setProfile] = useState<{
    login: string;
    name: string | null;
    avatarUrl: string;
    htmlUrl: string;
  } | null>(null);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [selected, setSelected] = useState<RepoSummary | null>(null);
  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [listing, setListing] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stage, setStage] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pendingRepo, setPendingRepo] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadForm();
    setForm(stored);
    setHistory(loadHistory());
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) setToken(t);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveForm(form);
  }, [form, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }, [token, hydrated]);

  useEffect(() => {
    if (!generating) return;
    setStage(0);
    const id = window.setInterval(() => {
      setStage((s) => (s + 1) % STAGES.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [generating]);

  const filteredRepos = useMemo(() => {
    const q = repoQuery.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.language?.toLowerCase().includes(q),
    );
  }, [repos, repoQuery]);

  function patch(partial: Partial<PersistedForm>) {
    setForm((f) => ({ ...f, ...partial }));
  }

  async function loadRepos(usernameOverride?: string, selectName?: string) {
    const raw = (usernameOverride ?? form.username).trim();
    if (!raw) {
      toast.error("请填写 GitHub 用户名或仓库地址");
      return;
    }
    const parsed = parseRepoRef(raw);
    const username = parsed?.owner ?? raw.replace(/^@/, "");
    if (parsed) {
      patch({ username: parsed.owner });
      setPendingRepo(parsed.repo);
    }
    const want = selectName ?? parsed?.repo ?? pendingRepo;
    setListing(true);
    try {
      const res = await listReposFn({ data: { username, token: token || undefined } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setProfile(res.profile);
      setRepos(res.repos);
      const match = want
        ? res.repos.find((r) => r.name.toLowerCase() === want.toLowerCase())
        : undefined;
      if (match) {
        await selectRepo(match);
        setPendingRepo(null);
      } else {
        toast.success(`已读取 ${res.repos.length} 个仓库`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "读取失败");
    } finally {
      setListing(false);
    }
  }

  async function selectRepo(repo: RepoSummary) {
    setSelected(repo);
    setBriefing(true);
    setBrief(null);
    try {
      const [owner, name] = repo.fullName.split("/");
      const res = await fetchBriefFn({
        data: { owner: owner ?? "", repo: name ?? repo.name, token: token || undefined },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setBrief(res.brief);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "读取仓库详情失败");
    } finally {
      setBriefing(false);
    }
  }

  async function generate() {
    if (generating) return;
    setActionError(null);
    setGenerating(true);
    try {
      const res = await generateResumeFn({
        data: {
          owner: selected?.fullName.split("/")[0],
          repo: selected?.name,
          token: token || undefined,
          brief,
          jd: form.jd ?? "",
          roleTitle: form.roleTitle ?? "",
          language: form.language === "en" ? "en" : "zh",
          bulletCount: form.bulletCount,
          extraNotes: form.extraNotes ?? "",
          period: form.period ?? "",
          organization: form.organization ?? "",
          role: form.role ?? "",
          webSearch: Boolean(form.webSearch),
        },
      });
      if (!res.ok) {
        setActionError(res.error);
        toast.error(res.error);
        return;
      }
      setResult(res.result);
      const item: HistoryItem = {
        id: `${Date.now()}`,
        createdAt: res.result.generatedAt,
        repoFullName: selected?.fullName || "手动项目",
        roleTitle: form.roleTitle || res.result.role,
        result: res.result,
      };
      setHistory(pushHistory(item));
      toast.success("成稿已写入右侧");
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成失败";
      setActionError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  function loadSample() {
    patch({
      username: SAMPLE_USERNAME,
      jd: SAMPLE_JD,
      roleTitle: SAMPLE_ROLE_TITLE,
      extraNotes: SAMPLE_NOTES,
      role: "后端开发",
      organization: "开源贡献",
      language: "zh",
      bulletCount: 4,
      webSearch: true,
    });
    void loadRepos(SAMPLE_USERNAME, "gin");
  }

  const langCount = brief
    ? Object.entries(brief.languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <div className="flex min-h-dvh flex-col">
      <Masthead
        onHistory={() => setHistoryOpen(true)}
        onAbout={() => setAboutOpen(true)}
        historyCount={history.length}
      />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <section className="stagger-in mb-8 max-w-2xl">
          <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
            GitHub → JD → 可编译段落
          </p>
          <h1 className="font-display mt-2 text-[2rem] leading-[1.15] font-medium tracking-tight sm:text-4xl">
            把仓库写成面试官会追问的项目经历
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            读取公开仓库的 README、语言与提交记录，对照你要面的岗位 JD，写成 STAR
            要点。默认导出严谨 LaTeX，同时提供 Markdown。数字只来自证据，缺了就标待填。
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={loadSample} disabled={listing}>
              载入示例（gin-gonic/gin + Golang JD）
            </Button>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <section className="rounded-xl bg-card p-5 shadow-border">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] text-muted-foreground">01</p>
                  <h2 className="font-display mt-1 text-lg tracking-tight">绑定仓库</h2>
                </div>
                <Github className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                填写用户名读取公开仓库；也可粘贴 github.com/owner/repo。私有仓库仅把令牌用于本次请求，存在会话里，不入库。
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={form.username}
                  onChange={(e) => patch({ username: e.target.value })}
                  placeholder="用户名或 owner/repo"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadRepos();
                  }}
                  aria-label="GitHub 用户名或仓库"
                />
                <Button onClick={() => void loadRepos()} disabled={listing} className="sm:w-36">
                  {listing ? <Loader2 className="animate-spin" /> : <Search />}
                  读取
                </Button>
              </div>
              <button
                type="button"
                className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setShowToken((v) => !v)}
              >
                {showToken ? "收起令牌" : "私有仓库 / 提高配额"}
              </button>
              {showToken && (
                <Input
                  className="mt-2"
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_ 或 github_pat_ 只读令牌"
                />
              )}

              {profile && (
                <div className="mt-4 flex items-center gap-3">
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="size-8 rounded-full outline outline-1 -outline-offset-1 outline-foreground/10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{profile.name || profile.login}</p>
                    <p className="truncate text-xs text-muted-foreground">@{profile.login}</p>
                  </div>
                </div>
              )}

              {repos.length > 0 && (
                <>
                  <Input
                    className="mt-4"
                    value={repoQuery}
                    onChange={(e) => setRepoQuery(e.target.value)}
                    placeholder="筛选仓库名、语言、描述"
                  />
                  <ScrollArea className="mt-3 h-56 rounded-md bg-background">
                    <ul className="divide-y divide-border">
                      {filteredRepos.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => void selectRepo(r)}
                            className={cn(
                              "flex w-full flex-col items-start gap-1 px-3 py-3 text-left transition-colors hover:bg-muted/70",
                              selected?.id === r.id && "bg-accent",
                            )}
                          >
                            <span className="flex w-full items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">{r.name}</span>
                              <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                                {r.stars}★
                              </span>
                            </span>
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                              {r.description || "无描述"}
                            </span>
                            <span className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              {r.language && <span>{r.language}</span>}
                              <span>
                                {formatDistanceToNow(new Date(r.updatedAt), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </>
              )}

              {(briefing || brief) && (
                <div className="mt-4 rounded-md bg-muted/70 p-3">
                  {briefing && (
                    <p className="shimmer-text text-xs">正在抽取 README、语言与提交记录…</p>
                  )}
                  {brief && !briefing && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium">{brief.fullName}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {brief.description || "无描述"} · {brief.commitMessages.length} 条近期提交 ·{" "}
                        {brief.topFiles.length} 个顶层文件
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {langCount.map(([lang]) => (
                          <Badge key={lang}>{lang}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl bg-card p-5 shadow-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void generate();
                }}
              >
              <p className="font-mono text-[11px] text-muted-foreground">02</p>
              <h2 className="font-display mt-1 text-lg tracking-tight">岗位 JD</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="roleTitle">应聘岗位</Label>
                  <Input
                    id="roleTitle"
                    className="mt-1.5"
                    value={form.roleTitle}
                    onChange={(e) => patch({ roleTitle: e.target.value })}
                    placeholder="如：高级后端开发工程师"
                  />
                </div>
                <div>
                  <Label htmlFor="role">简历上的角色</Label>
                  <Input
                    id="role"
                    className="mt-1.5"
                    value={form.role}
                    onChange={(e) => patch({ role: e.target.value })}
                    placeholder="后端开发 / 核心贡献者"
                  />
                </div>
                <div>
                  <Label htmlFor="org">组织 / 公司</Label>
                  <Input
                    id="org"
                    className="mt-1.5"
                    value={form.organization}
                    onChange={(e) => patch({ organization: e.target.value })}
                    placeholder="开源项目 / 某公司"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="period">时间</Label>
                  <Input
                    id="period"
                    className="mt-1.5"
                    value={form.period}
                    onChange={(e) => patch({ period: e.target.value })}
                    placeholder="2024.03 -- 2025.01（可留空，按仓库日期推断）"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor="jd">完整 JD</Label>
                <Textarea
                  id="jd"
                  className="mt-1.5 min-h-40"
                  value={form.jd}
                  onChange={(e) => patch({ jd: e.target.value })}
                  placeholder="粘贴岗位职责与任职要求…"
                />
              </div>
              <div className="mt-3">
                <Label htmlFor="notes">你的真实贡献与数字（可选，但强烈建议）</Label>
                <Textarea
                  id="notes"
                  className="mt-1.5 min-h-28"
                  value={form.extraNotes}
                  onChange={(e) => patch({ extraNotes: e.target.value })}
                  placeholder="例如：我做了限流中间件；QPS 从 2k 提到 8k。没有数字就写「待量化」。"
                />
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <Label>语言</Label>
                  <div className="mt-1.5">
                    <Segmented
                      value={form.language}
                      onChange={(language) => patch({ language })}
                      options={[
                        { value: "zh", label: "中文" },
                        { value: "en", label: "English" },
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <Label>条数</Label>
                  <div className="mt-1.5">
                    <Segmented
                      value={String(form.bulletCount)}
                      onChange={(v) => patch({ bulletCount: Number(v) })}
                      options={[3, 4, 5, 6].map((n) => ({
                        value: String(n),
                        label: `${n} 条`,
                      }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>LaTeX 模板</Label>
                  <div className="mt-1.5">
                    <Segmented
                      value={form.template}
                      onChange={(template) => patch({ template })}
                      options={[
                        { value: "billryan", label: "Billryan" },
                        { value: "awesomeCv", label: "Awesome-CV" },
                        { value: "moderncv", label: "moderncv" },
                        { value: "itemize", label: "通用" },
                      ]}
                    />
                  </div>
                </div>
              </div>
              {actionError && (
                <p className="mt-3 text-sm text-destructive">{actionError}</p>
              )}
              <Button
                type="submit"
                className="mt-4 w-full"
                disabled={generating || !form.jd?.trim()}
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {STAGES[stage]}
                  </>
                ) : (
                  <>
                    <PenLine />
                    生成项目经历
                  </>
                )}
              </Button>
              </form>
            </section>
          </div>

          <div className="lg:sticky lg:top-6">
            <ResultPanel
              result={result}
              template={(form.template as LatexTemplate) || "billryan"}
              onTemplate={(template) => patch({ template })}
            />
          </div>
        </div>
      </main>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogTitle>历史成稿</DialogTitle>
          <DialogDescription>本机会话内最近生成的段落，不会上传。</DialogDescription>
          <ul className="mt-4 max-h-80 space-y-2 overflow-auto">
            {history.length === 0 && (
              <li className="text-sm text-muted-foreground">还没有历史记录。</li>
            )}
            {history.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setResult(h.result);
                    setHistoryOpen(false);
                  }}
                >
                  <span className="font-medium">{h.repoFullName}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {h.roleTitle} · {new Date(h.createdAt).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent>
          <DialogTitle>关于项述</DialogTitle>
          <DialogDescription>
            从 GitHub 仓库证据出发，按岗位 JD 写成可编译的 LaTeX 项目经历段落。数字只来自证据；缺则标待填，不编造。
          </DialogDescription>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>公开仓库无需令牌；私有仓库令牌仅存 sessionStorage</li>
            <li>支持 Billryan / Awesome-CV / moderncv / 通用 itemize</li>
            <li>无模型额度时自动走规则起草</li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
