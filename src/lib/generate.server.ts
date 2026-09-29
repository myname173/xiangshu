import { renderLatexBundle, renderMarkdown } from "./latex";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { buildFallbackDraft } from "./draft-fallback";
import type {
  Language,
  ProjectBrief,
  ResumeDraft,
  ResumeResult,
} from "./types";

let skipModel = false;
const MODEL = "grok-4.5";

export type GenerateInput = {
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
};

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1] ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("模型未返回可解析的 JSON。");
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

function asBool(v: unknown): boolean {
  return v === true;
}

function normalizeDraft(raw: unknown, input: GenerateInput): ResumeDraft {
  if (!raw || typeof raw !== "object") {
    throw new Error("模型返回格式无效。");
  }
  const o = raw as Record<string, unknown>;
  const bulletsRaw = Array.isArray(o.bullets) ? o.bullets : [];
  const bullets = bulletsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const b = item as Record<string, unknown>;
      const text = asString(b.text);
      if (!text) return null;
      return {
        text,
        keywords: asStringArray(b.keywords),
        metrics: asStringArray(b.metrics),
        needsQuantification: asBool(b.needsQuantification),
        interviewQuestion: asString(b.interviewQuestion),
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .slice(0, Math.max(3, Math.min(8, input.bulletCount)));

  if (bullets.length === 0) {
    throw new Error("模型没有写出任何项目要点。");
  }

  const jdHitsRaw = Array.isArray(o.jdHits) ? o.jdHits : [];
  const jdHits = jdHitsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const h = item as Record<string, unknown>;
      const keyword = asString(h.keyword);
      if (!keyword) return null;
      return { keyword, covered: asBool(h.covered) };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .slice(0, 12);

  const fallbackTitle = input.brief?.name ?? "未命名项目";
  const fallbackOrg =
    input.organization ||
    (input.language === "zh" ? "开源项目" : "Open source");
  const created = input.brief?.createdAt?.slice(0, 7).replace("-", ".") ?? "";
  const updated = input.brief?.updatedAt?.slice(0, 7).replace("-", ".") ?? "";
  const fallbackPeriod =
    input.period || (created && updated ? `${created} -- ${updated}` : "");

  return {
    projectTitle: asString(o.projectTitle, fallbackTitle),
    role: asString(
      o.role,
      input.role || input.roleTitle || (input.language === "zh" ? "开发" : "Engineer"),
    ),
    period: asString(o.period, fallbackPeriod),
    organization: asString(o.organization, fallbackOrg),
    stack: asStringArray(o.stack).slice(0, 10),
    oneLiner: asString(o.oneLiner),
    bullets,
    jdHits,
    gaps: asStringArray(o.gaps).slice(0, 8),
    interviewPrep: asStringArray(o.interviewPrep).slice(0, 6),
    researchNotes: asStringArray(o.researchNotes).slice(0, 6),
  };
}

function extractResponsesText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const o = body as Record<string, unknown>;
  if (typeof o.output_text === "string" && o.output_text.trim()) {
    return o.output_text;
  }
  const output = o.output;
  if (!Array.isArray(output)) return "";
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const content = it.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      if (typeof p.text === "string") chunks.push(p.text);
    }
  }
  return chunks.join("\n");
}

function isUnavailableStatus(status: number, body: string): boolean {
  if (status === 402 || status === 429) return true;
  if (status === 403) {
    return /spending-limit|credits|quota|subscription/i.test(body);
  }
  return false;
}

export class AiUnavailableError extends Error {
  constructor() {
    super("AI_UNAVAILABLE");
    this.name = "AiUnavailableError";
  }
}

async function callResponses(apiKey: string, user: string): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      max_output_tokens: 3500,
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (isUnavailableStatus(res.status, errText)) throw new AiUnavailableError();
    throw new Error(`search:${res.status}`);
  }
  const body: unknown = await res.json();
  const text = extractResponsesText(body);
  if (!text.trim()) throw new Error("empty-search-output");
  return text;
}

async function callChat(
  apiKey: string,
  user: string,
  extraSystem?: string,
): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: extraSystem ? `${SYSTEM_PROMPT}\n${extraSystem}` : SYSTEM_PROMPT,
        },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (isUnavailableStatus(res.status, errText)) throw new AiUnavailableError();
    throw new Error(`xAI API error ${res.status}`);
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return body.choices?.[0]?.message?.content ?? "";
}

function finalize(draft: ResumeDraft, language: Language, engine: "model" | "rules"): ResumeResult {
  return {
    ...draft,
    markdown: renderMarkdown(draft),
    latex: renderLatexBundle(draft, language),
    generatedAt: new Date().toISOString(),
    engine,
  };
}

export async function generateResumeDraft(
  input: GenerateInput,
): Promise<ResumeResult> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey || skipModel) {
    return finalize(buildFallbackDraft(input), input.language, "rules");
  }

  const user = buildUserPrompt(input);

  try {
    let text = "";
    if (input.webSearch) {
      try {
        text = await callResponses(apiKey, user);
      } catch (err) {
        if (err instanceof AiUnavailableError) throw err;
        text = await callChat(
          apiKey,
          user,
          "Web search was unavailable. Continue without live sources; leave researchNotes empty if you did not search.",
        );
      }
    } else {
      text = await callChat(apiKey, user);
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(text);
    } catch {
      const retry = await callChat(
        apiKey,
        `${user}\n\nYour previous reply was not valid JSON. Reply with the JSON object only.`,
      );
      parsed = extractJsonObject(retry);
    }

    return finalize(normalizeDraft(parsed, input), input.language, "model");
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      skipModel = true;
      return finalize(buildFallbackDraft(input), input.language, "rules");
    }
    throw err;
  }
}
