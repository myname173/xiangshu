import { createServerFn } from "@tanstack/react-start";
import { fetchProjectBrief, GithubError, listGithubRepos } from "./github.server";

function sanitizeToken(token: string | undefined): string | undefined {
  const t = token?.trim();
  if (!t) return undefined;
  if (t.length < 8 || t.length > 256) {
    throw new Error("令牌长度异常，请检查后重试。");
  }
  return t;
}

function sanitizeUser(username: string): string {
  const u = username.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(u)) {
    throw new Error("GitHub 用户名格式不正确。");
  }
  return u;
}

export const listReposFn = createServerFn({ method: "POST" })
  .validator((data: { username: string; token?: string }) => ({
    username: sanitizeUser(data.username),
    token: sanitizeToken(data.token),
  }))
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await listGithubRepos(data.username, data.token)) };
    } catch (err) {
      const message =
        err instanceof GithubError ? err.message : "读取仓库列表失败。";
      return { ok: false as const, error: message };
    }
  });

export const fetchBriefFn = createServerFn({ method: "POST" })
  .validator((data: { owner: string; repo: string; token?: string }) => {
    const owner = data.owner.trim();
    const repo = data.repo.trim();
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
      throw new Error("仓库名称格式不正确。");
    }
    return { owner, repo, token: sanitizeToken(data.token) };
  })
  .handler(async ({ data }) => {
    try {
      const brief = await fetchProjectBrief(data.owner, data.repo, data.token);
      return { ok: true as const, brief };
    } catch (err) {
      const message =
        err instanceof GithubError ? err.message : "读取仓库详情失败。";
      return { ok: false as const, error: message };
    }
  });
