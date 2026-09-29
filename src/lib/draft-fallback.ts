import type { Language, ProjectBrief, ResumeBullet, ResumeDraft } from "./types";

const FILE_STACK: Record<string, string> = {
  "go.mod": "Go",
  "Cargo.toml": "Rust",
  "package.json": "Node.js",
  "pnpm-lock.yaml": "Node.js",
  "pyproject.toml": "Python",
  "requirements.txt": "Python",
  Dockerfile: "Docker",
  "docker-compose.yml": "Docker",
  "compose.yaml": "Docker",
  "tsconfig.json": "TypeScript",
  "pom.xml": "Java",
  "build.gradle": "Java",
  "CMakeLists.txt": "C++",
};

const SKIP_LANG = new Set([
  "Makefile",
  "CMake",
  "Shell",
  "HTML",
  "CSS",
  "Procfile",
  "Batchfile",
]);

const JD_TERMS = [
  "高并发",
  "中间件",
  "可观测",
  "限流",
  "熔断",
  "超时",
  "链路追踪",
  "微服务",
  "缓存",
  "一致性",
  "gRPC",
  "RESTful",
  "HTTP",
  "Gin",
  "Go",
  "Redis",
  "MySQL",
  "PostgreSQL",
  "Kubernetes",
  "SLA",
  "API",
  "测试",
  "性能",
  "observability",
  "middleware",
  "latency",
];

const NOTE_SKIP =
  /请(用|按|不要|补)|若用于|不要写成|暂时没有|占位|口径写|面试官/;

function titleCaseRepo(name: string): string {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function detectStack(brief: ProjectBrief | null): string[] {
  const stack: string[] = [];
  const push = (s: string) => {
    if (!s || SKIP_LANG.has(s) || stack.includes(s)) return;
    if (s === "Golang") s = "Go";
    if (!stack.includes(s)) stack.push(s);
  };
  if (brief?.language) push(brief.language);
  const langs = Object.entries(brief?.languages ?? {}).sort((a, b) => b[1] - a[1]);
  for (const [lang] of langs) push(lang);
  for (const file of brief?.topFiles ?? []) {
    if (FILE_STACK[file]) push(FILE_STACK[file]);
  }
  return stack.slice(0, 6);
}

function jdKeywords(jd: string): string[] {
  const hits: string[] = [];
  for (const term of JD_TERMS) {
    if (jd.includes(term) && !hits.includes(term)) hits.push(term);
  }
  return hits.slice(0, 8);
}

function hasDigit(s: string): boolean {
  return /\d/.test(s);
}

function sourceFiles(files: string[]): string[] {
  const ranked = files
    .filter(
      (f) =>
        !f.startsWith(".") &&
        !/^(LICENSE|CHANGELOG|CONTRIBUTING|CODE_OF_CONDUCT|README|BENCHMARKS|Makefile|Dockerfile)(\.|$)/i.test(
          f,
        ) &&
        !/\.md$/i.test(f),
    )
    .sort((a, b) => {
      const score = (f: string) =>
        /\.(go|ts|tsx|rs|py|java)$/i.test(f) ? 0 : /_test\./i.test(f) ? 1 : 2;
      return score(a) - score(b);
    });
  return ranked.slice(0, 4);
}

function clipAtWord(s: string, n: number): string {
  if (s.length <= n) return s;
  const slice = s.slice(0, n);
  const ws = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("，"), slice.lastIndexOf("。"));
  return (ws > n * 0.45 ? slice.slice(0, ws) : slice).replace(/[,，、\s]+$/, "");
}

function contributionFromNotes(notes: string): string | null {
  const parts = notes
    .split(/[\n。；;]+/)
    .map((s) => s.replace(/^[-•\s]+/, "").trim())
    .filter((s) => s.length >= 12 && !NOTE_SKIP.test(s));
  if (!parts.length) return null;
  return parts.join("，").replace(/[。.\s]+$/, "");
}

function bullet(
  text: string,
  keywords: string[],
  interviewQuestion: string,
): ResumeBullet {
  return {
    text,
    keywords: [...new Set(keywords.filter(Boolean))].slice(0, 4),
    metrics: hasDigit(text)
      ? [text.match(/[\d.]+%?[\w千百万kKmM]*/)?.[0] ?? ""].filter(Boolean)
      : [],
    needsQuantification: !hasDigit(text),
    interviewQuestion,
  };
}

export function buildFallbackDraft(input: {
  brief: ProjectBrief | null;
  jd: string;
  roleTitle: string;
  language: Language;
  bulletCount: number;
  extraNotes: string;
  period: string;
  organization: string;
  role: string;
}): ResumeDraft {
  const zh = input.language !== "en";
  const brief = input.brief;
  const stack = detectStack(brief);
  const keys = jdKeywords(input.jd);
  const title = brief ? titleCaseRepo(brief.name) : zh ? "未命名项目" : "Untitled project";
  const role = input.role || input.roleTitle || (zh ? "开发" : "Engineer");
  const org = input.organization || (zh ? "开源项目" : "Open source");
  const desc = clipAtWord(
    (brief?.description?.replace(/\s+/g, " ").trim() ?? "").split(/(?<=[.。])\s/)[0] ?? "",
    88,
  ).replace(/[.。]$/, "");
  const files = sourceFiles(brief?.topFiles ?? []);
  const contribution = contributionFromNotes(input.extraNotes);
  const count = Math.min(6, Math.max(3, input.bulletCount || 4));
  const bullets: ResumeBullet[] = [];

  if (contribution) {
    bullets.push(
      bullet(
        zh
          ? `${contribution}。陈述口径为仓库贡献者/使用者，不以框架作者自居。${hasDigit(contribution) ? "" : "【待量化：覆盖模块或单测数】"}`
          : `${contribution}. Framed as a contributor/user of the repo, not its author.${hasDigit(contribution) ? "" : " [TBD: modules or tests]"}`,
        keys.filter((k) => /中间件|测试|Gin|Go|middleware/.test(k) || contribution.includes(k)),
        zh
          ? "哪些改动是你做的？哪些是阅读上游代码后的理解？"
          : "What did you change versus what you only read?",
      ),
    );
  }

  if (brief && bullets.length < count) {
    const fileHint = files.length ? files.join("、") : "";
    bullets.push(
      bullet(
        zh
          ? `基于 ${brief.fullName}${desc ? `（${desc}）` : ""} 的${stack.slice(0, 3).join(" / ") || "工程"}实现，梳理${fileHint ? ` ${fileHint} 等` : ""}核心路径，并按岗位中的「${keys[0] || "工程实现"}」来写可追问的要点。【待量化：个人 diff 行数/模块】`
          : `Used ${brief.fullName}${desc ? ` (${desc})` : ""} (${stack.slice(0, 3).join(" / ") || "stack"})${fileHint ? `; core files ${fileHint}` : ""} and wrote interview-ready bullets against “${keys[0] || "implementation"}”. [TBD: diff size]`,
        keys.filter((k) => stack.includes(k) || ["Go", "Gin", "HTTP", "API"].includes(k)).slice(0, 4),
        zh ? "如果面试官要看代码，你打开哪几个文件？" : "Which files would you open first?",
      ),
    );
  }

  if (
    keys.some((k) => /高并发|性能|限流|超时|中间件|HTTP|API|latency/.test(k)) &&
    bullets.length < count
  ) {
    bullets.push(
      bullet(
        zh
          ? `对照 JD 中的高并发 HTTP 场景，梳理请求链路上的中间件顺序、超时与错误返回，能讲清 Context 传递以及限流/熔断应落在哪一层。【待量化：P99 / QPS / 超时阈值】`
          : `Mapped middleware order, timeouts and error returns on the HTTP path against the JD, including where rate-limit/circuit-break belongs. [TBD: p99 / QPS]`,
        keys.filter((k) => /高并发|限流|超时|中间件|HTTP|API|Gin|性能/.test(k)),
        zh ? "超时发生在哪一层？为什么不放在更外层？" : "Where does the timeout live, and why?",
      ),
    );
  }

  if (/单测|测试|test/i.test(input.extraNotes) && bullets.length < count) {
    bullets.push(
      bullet(
        zh
          ? `把绑定校验与错误响应补进测试，用失败用例锁住错误码与校验边界，避免回归时口径漂移。【待量化：新增用例数 / 覆盖率】`
          : `Locked binding validation and error responses behind failing tests so error codes do not drift. [TBD: new cases / coverage]`,
        keys.filter((k) => /测试/.test(k)).concat(["测试"]).slice(0, 3),
        zh ? "一次改动里你如何证明没有回归？" : "How did you prove no regression?",
      ),
    );
  }

  while (bullets.length < count) {
    bullets.push(
      bullet(
        zh
          ? `数字、规模与个人贡献边界一律标待填，不把 Stars 或框架名声写进自己的业绩。【待量化：影响面】`
          : `Stars and project fame are not claimed as personal impact; scale stays TBD. [TBD: impact]`,
        keys.slice(0, 2),
        zh ? "如果对方把你当成作者，你怎么纠正？" : "How do you correct someone who thinks you authored it?",
      ),
    );
  }

  const used = bullets.slice(0, count);
  const covered = new Set(used.flatMap((b) => b.keywords));
  const hay = `${contribution ?? ""} ${desc} ${stack.join(" ")} ${brief?.readme.slice(0, 1500) ?? ""}`;

  return {
    projectTitle: title,
    role,
    period: input.period.trim(),
    organization: org,
    stack,
    oneLiner: zh
      ? `按 ${brief ? brief.fullName : "项目说明"} 的公开证据起草；缺数字处已标待填，未把仓库作者身份写进简历。`
      : `Drafted from ${brief ? brief.fullName : "notes"}; missing metrics marked TBD; authorship not claimed.`,
    bullets: used,
    jdHits: keys.map((keyword) => ({
      keyword,
      covered: covered.has(keyword) || hay.includes(keyword),
    })),
    gaps: zh
      ? [
          "缺少可引用的性能数字（QPS / P99 / 错误率）",
          "请补上你的个人 diff 范围，避免被问成「这是你写的框架吗」",
        ]
      : [
          "No cited performance numbers (QPS / p99 / error rate)",
          "Add the scope of your own diff so you are not taken as the original author",
        ],
    interviewPrep: zh
      ? [
          "准备画一张请求生命周期：路由 → 中间件 → handler → 错误返回",
          "准备一句：我贡献的是 X，上游已有的是 Y",
        ]
      : [
          "Be ready to sketch request lifecycle: route → middleware → handler → error",
          "Prepare: I contributed X; upstream already had Y",
        ],
    researchNotes: [],
  };
}
