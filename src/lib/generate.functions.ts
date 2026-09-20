import { createServerFn } from "@tanstack/react-start";
import { fetchProjectBrief } from "./github.server";
import { generateResumeDraft } from "./generate.server";
import type { Language, ProjectBrief } from "./types";

function asText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export const generateResumeFn = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    const data =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const jd = asText(data.jd).trim();
    if (jd.length < 20) {
      throw new Error("请粘贴更完整的岗位 JD（至少 20 字）。");
    }
    if (jd.length > 8000) {
      throw new Error("JD 过长，请精简到 8000 字以内。");
    }
    const extraNotes = asText(data.extraNotes).trim().slice(0, 4000);
    const bulletCount = Math.min(6, Math.max(3, Number(data.bulletCount) || 4));
    const language: Language = data.language === "en" ? "en" : "zh";
    const token = asText(data.token).trim() || undefined;
    if (token && (token.length < 8 || token.length > 256)) {
      throw new Error("令牌长度异常。");
    }
    const owner = asText(data.owner).trim() || undefined;
    const repo = asText(data.repo).trim() || undefined;
    const brief = (data.brief as ProjectBrief | null | undefined) ?? null;
    if (!brief && !(owner && repo) && extraNotes.length < 40) {
      throw new Error("请选择一个 GitHub 仓库，或补充不少于 40 字的项目说明。");
    }
    return {
      owner,
      repo,
      token,
      brief,
      jd,
      roleTitle: asText(data.roleTitle).trim().slice(0, 80),
      language,
      bulletCount,
      extraNotes,
      period: asText(data.period).trim().slice(0, 40),
      organization: asText(data.organization).trim().slice(0, 80),
      role: asText(data.role).trim().slice(0, 80),
      webSearch: Boolean(data.webSearch),
    };
  })
  .handler(async ({ data }) => {
    try {
      let brief = data.brief;
      if (!brief && data.owner && data.repo) {
        brief = await fetchProjectBrief(data.owner, data.repo, data.token);
      }

      const result = await generateResumeDraft({
        brief,
        jd: data.jd,
        roleTitle: data.roleTitle,
        language: data.language,
        bulletCount: data.bulletCount,
        extraNotes: data.extraNotes,
        period: data.period,
        organization: data.organization,
        role: data.role,
        webSearch: data.webSearch,
      });
      return { ok: true as const, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成失败";
      return { ok: false as const, error: message };
    }
  });
