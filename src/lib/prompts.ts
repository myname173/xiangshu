import type { Language, ProjectBrief } from "./types";

export const SYSTEM_PROMPT = `You are a senior technical résumé editor for competitive software interviews (China + global Big Tech / startups). You write project-experience bullets that hiring managers and interviewers actually trust.

Hard rules:
1. Evidence-first. Use ONLY facts present in the repository brief, the candidate's notes, and the job description. Never invent headcount, QPS, latency, funding, users, or revenue. If a metric is missing, write the bullet with a clear placeholder like 【待量化：P99 延迟】 or [TBD: p99 latency] — do not fabricate a number.
2. STAR/XYZ compressed into one sentence per bullet: strong verb + what you built + how (tech/decision) + result or complexity. No hollow phrases: "负责xx模块的开发与维护", "参与", "熟悉", "赋能", "闭环", "落地从0到1" without a concrete artifact.
3. Align to the JD. Mirror the employer's vocabulary where it is truthful (e.g. if the JD wants 高并发 and the repo has a queue/cache, say so). Do not keyword-stuff irrelevant terms.
4. Tech must be specific (Gin, Redis Stream, PostgreSQL, Kubernetes) — not "后端技术栈".
5. Each bullet is one idea. Chinese: 28–55 characters is too short; aim for 45–90 Chinese characters or 18–32 English words. No trailing period soup. Start with a verb (主导/设计/实现/将/Built/Designed/Cut).
6. If the repo is a library/demo with little product context, write honest engineering bullets (API design, test strategy, perf, DX) rather than fake business impact.
7. Output MUST be a single JSON object, no markdown fences, no commentary.
8. Language of bullet text, oneLiner, gaps, interviewPrep, interviewQuestion must match the requested language. JSON keys stay in English as specified.
9. period: use YYYY.MM -- YYYY.MM from repo dates if the user did not supply one. organization: "开源项目" / "Open source" or the user-supplied org — never invent a company.
10. researchNotes: 2–5 short takeaways from any web research (industry phrasing, not other people's claims). If no research ran, return an empty array.

JSON shape:
{
  "projectTitle": string,
  "role": string,
  "period": string,
  "organization": string,
  "stack": string[],
  "oneLiner": string,
  "bullets": [
    {
      "text": string,
      "keywords": string[],
      "metrics": string[],
      "needsQuantification": boolean,
      "interviewQuestion": string
    }
  ],
  "jdHits": [{ "keyword": string, "covered": boolean }],
  "gaps": string[],
  "interviewPrep": string[],
  "researchNotes": string[]
}`;

export function buildUserPrompt(input: {
  brief: ProjectBrief | null;
  jd: string;
  roleTitle: string;
  language: Language;
  bulletCount: number;
  extraNotes: string;
  period: string;
  organization: string;
  role: string;
  webSearch: boolean;
}): string {
  const langLine =
    input.language === "zh"
      ? "Write all human-facing strings in Simplified Chinese."
      : "Write all human-facing strings in English.";

  const searchLine = input.webSearch
    ? `Use web search to look up current résumé-writing standards and phrasing for this role (${input.roleTitle || "software engineer"}). Search queries should cover: STAR/XYZ bullets for this job family, keywords ATS/HR expect, and what interviewers probe. Do NOT copy anyone else's project claims. Fold useful phrasing into researchNotes.`
    : "Do not browse the web. Rely on the brief, JD, and résumé craft rules.";

  const briefBlock = input.brief
    ? `Repository:
- ${input.brief.fullName} (${input.brief.htmlUrl})
- Description: ${input.brief.description ?? "(none)"}
- Homepage: ${input.brief.homepage ?? "(none)"}
- Primary language: ${input.brief.language ?? "unknown"}
- Languages: ${JSON.stringify(input.brief.languages)}
- Stars/forks: ${input.brief.stars}/${input.brief.forks}
- Topics: ${input.brief.topics.join(", ") || "(none)"}
- Created/updated: ${input.brief.createdAt} / ${input.brief.updatedAt}
- Top-level files: ${input.brief.topFiles.join(", ")}
- Recent commit messages:
${input.brief.commitMessages.map((m) => `  - ${m}`).join("\n") || "  (none)"}
- README (truncated):
"""
${input.brief.readme}
"""`
    : "No GitHub repository was attached. Use only the candidate notes below.";

  return `${searchLine}
${langLine}
Write exactly ${input.bulletCount} bullets.

Target role / title: ${input.roleTitle || "(not specified)"}
Requested role line on résumé: ${input.role || "(infer from notes/repo)"}
Requested period: ${input.period || "(infer from repo dates)"}
Requested organization: ${input.organization || "(infer)"}

Job description:
"""
${input.jd}
"""

Candidate notes (treat as first-person ground truth, still do not invent metrics they did not write):
"""
${input.extraNotes || "(none)"}
"""

${briefBlock}`;
}
