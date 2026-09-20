export function parseRepoRef(
  input: string,
): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\.git$/, "");
  const urlMatch = trimmed.match(
    /github\.com[:/]+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i,
  );
  if (urlMatch?.[1] && urlMatch[2]) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }
  const short = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (short?.[1] && short[2]) {
    return { owner: short[1], repo: short[2] };
  }
  return null;
}
