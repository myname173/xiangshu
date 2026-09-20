import type { ProjectBrief, RepoSummary } from "./types";
export { parseRepoRef } from "./repo-ref";

const API = "https://api.github.com";
const UA = "Xiangshu-Resume";

export class GithubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": UA,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function gh<T>(path: string, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: authHeaders(token),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new GithubError("无法连接 GitHub，请稍后重试。", 503);
  }

  if (res.status === 401) {
    throw new GithubError("GitHub 令牌无效或已过期。", 401);
  }
  if (res.status === 403) {
    throw new GithubError(
      "GitHub 接口配额已用尽。填写具有 repo 读权限的令牌可提高限额。",
      403,
    );
  }
  if (res.status === 404) {
    throw new GithubError("未找到该用户或仓库（私有仓库需要令牌）。", 404);
  }
  if (!res.ok) {
    throw new GithubError(`GitHub 返回 ${res.status}，请稍后重试。`, res.status);
  }
  return (await res.json()) as T;
}

type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics?: string[];
  html_url: string;
  private: boolean;
  default_branch: string;
  fork?: boolean;
};

export async function listGithubRepos(
  username: string,
  token?: string,
): Promise<{
  profile: { login: string; name: string | null; avatarUrl: string; htmlUrl: string };
  repos: RepoSummary[];
}> {
  const user = await gh<{
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
  }>(`/users/${encodeURIComponent(username)}`, token);

  const repos = await gh<GhRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=40&type=owner`,
    token,
  );

  return {
    profile: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url,
    },
    repos: repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updatedAt: r.updated_at,
      topics: r.topics ?? [],
      htmlUrl: r.html_url,
      private: r.private,
      defaultBranch: r.default_branch,
    })),
  };
}

function decodeBase64(content: string): string {
  const cleaned = content.replace(/\n/g, "");
  try {
    return Buffer.from(cleaned, "base64").toString("utf8");
  } catch {
    return "";
  }
}

export async function fetchProjectBrief(
  owner: string,
  repo: string,
  token?: string,
): Promise<ProjectBrief> {
  const [info, languages, contents, commits] = await Promise.all([
    gh<{
      full_name: string;
      name: string;
      owner: { login: string };
      description: string | null;
      homepage: string | null;
      html_url: string;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      topics?: string[];
      created_at: string;
      updated_at: string;
      default_branch: string;
    }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token),
    gh<Record<string, number>>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`,
      token,
    ),
    gh<Array<{ name: string; type: string }>>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/`,
      token,
    ).catch(() => [] as Array<{ name: string; type: string }>),
    gh<Array<{ commit: { message: string } }>>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=18`,
      token,
    ).catch(() => [] as Array<{ commit: { message: string }>),
  ]);

  let readme = "";
  try {
    const raw = await gh<{ content?: string; encoding?: string }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
      token,
    );
    if (raw.content) readme = decodeBase64(raw.content);
  } catch {
    readme = "";
  }

  if (readme.length > 10000) {
    readme = `${readme.slice(0, 10000)}\n\n[README truncated]`;
  }

  const commitMessages = commits
    .map((c) => c.commit.message.split("\n")[0]?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 18);

  return {
    owner: info.owner.login,
    name: info.name,
    fullName: info.full_name,
    description: info.description,
    homepage: info.homepage,
    htmlUrl: info.html_url,
    language: info.language,
    languages,
    stars: info.stargazers_count,
    forks: info.forks_count,
    topics: info.topics ?? [],
    createdAt: info.created_at,
    updatedAt: info.updated_at,
    defaultBranch: info.default_branch,
    topFiles: contents.map((c) => c.name).slice(0, 40),
    readme,
    commitMessages,
  };
}
