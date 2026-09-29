/**
 * Shared PWA / OG helpers used by Vite plugin and Nitro middleware.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_APP_NAME = "Grok App";
export const OG_SERVICE_URL_DEFAULT = "https://og.grok.me";
export const OG_SITE_REL_PATH = "src/lib/og/site.json";
export const GROK_EXTENSIONS_SCRIPT_SRC =
  "https://grok.com/grok-app-builder/extensions.js";

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """)
    .replaceAll("'", "&#39;");
}

export function appNameFromHost(hostHeader) {
  const host = String(hostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  if (!host.endsWith(".grok.me")) return DEFAULT_APP_NAME;
  const slug = host.split(".")[0] ?? "";
  if (!slug || slug === "www" || !/^[a-z0-9-]{1,63}$/.test(slug)) {
    return DEFAULT_APP_NAME;
  }
  return (
    slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || DEFAULT_APP_NAME
  );
}

export function publicAppHost(hostHeader) {
  return String(hostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
}

export function resolvePublicHost(hostHeader) {
  return publicAppHost(hostHeader) || "localhost";
}

export function isInstallQuery(url) {
  try {
    const u = new URL(url, "http://local");
    return u.searchParams.get("install") === "1";
  } catch {
    return /[?&]install=1(?:&|$)/.test(String(url));
  }
}

export function isDocumentPath(pathname) {
  if (!pathname || pathname === "/") return true;
  if (pathname.startsWith("/api/") || pathname.startsWith("/__")) return false;
  if (/\.[a-z0-9]{1,8}$/i.test(pathname)) return false;
  return true;
}

export function acceptsHtml(accept) {
  if (!accept) return true;
  return String(accept).includes("text/html") || String(accept).includes("*/*");
}

export function stripInstallParams(url) {
  try {
    const u = new URL(url, "http://local");
    u.searchParams.delete("install");
    u.searchParams.delete("platform");
    return u.pathname + (u.search ? u.search : "");
  } catch {
    return url;
  }
}

export function renderInstallPageHtml(template, { host, url } = {}) {
  const name = appNameFromHost(host);
  return String(template)
    .replaceAll("{{APP_NAME}}", escapeHtml(name))
    .replaceAll("{{HOST}}", escapeHtml(resolvePublicHost(host)))
    .replaceAll("{{URL}}", escapeHtml(url ?? "/"));
}

export function renderWebManifest(hostHeader) {
  const name = appNameFromHost(hostHeader);
  return JSON.stringify(
    {
      name,
      short_name: name,
      start_url: "/",
      display: "standalone",
      background_color: "#000000",
      theme_color: "#000000",
      icons: [
        {
          src: "/__grok/icon-180.png",
          sizes: "180x180",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
    null,
    2,
  );
}

export function grokPwaHeadTags(appName = DEFAULT_APP_NAME) {
  const n = escapeHtml(appName);
  return [
    `<meta name="apple-mobile-web-app-title" content="${n}" />`,
    `<link rel="manifest" href="/__grok/manifest.webmanifest" />`,
    `<link rel="apple-touch-icon" href="/__grok/icon-180.png" />`,
    `<meta name="theme-color" content="#000000" />`,
  ].join("\n");
}

export function readGrokProjectId() {
  return process.env.GROK_PROJECT_ID?.trim() || "";
}

export function readXCreator() {
  return process.env.X_CREATOR?.trim() || "";
}

export function readXCreatorId() {
  return process.env.X_CREATOR_ID?.trim() || "";
}

export function grokXCreatorHeadTags(creator = readXCreator(), creatorId = readXCreatorId()) {
  const tags = [];
  if (creator) tags.push(`<meta name="twitter:creator" content="${escapeHtml(creator)}" />`);
  if (creatorId) tags.push(`<meta name="twitter:creator:id" content="${escapeHtml(creatorId)}" />`);
  return tags.join("\n");
}

export function grokExtensionsHeadTags(projectId = readGrokProjectId()) {
  if (!projectId) return "";
  return `<script src="${GROK_EXTENSIONS_SCRIPT_SRC}" data-project-id="${escapeHtml(projectId)}" defer></script>`;
}

export function readOgSite(cwd = process.cwd()) {
  try {
    const path = join(cwd, OG_SITE_REL_PATH);
    if (!existsSync(path)) return {};
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

export function snapshotOgIdentity(cwd = process.cwd()) {
  return { site: readOgSite(cwd) };
}

export function injectGrokPwaHead(html, ctx = {}) {
  const host = ctx.host ?? "";
  const appName = appNameFromHost(host);
  const inject = [
    grokPwaHeadTags(appName),
    grokXCreatorHeadTags(),
    grokExtensionsHeadTags(),
  ]
    .filter(Boolean)
    .join("\n");
  if (!inject) return html;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${inject}\n</head>`);
  }
  return inject + html;
}

export function createHeadInjector(ctx = {}) {
  let buffer = "";
  let done = false;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return {
    push(chunk) {
      if (done) return [chunk];
      buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
      const idx = buffer.toLowerCase().indexOf("</head>");
      if (idx === -1) {
        if (buffer.length > 64_000) {
          done = true;
          const out = buffer;
          buffer = "";
          return [encoder.encode(out)];
        }
        return [];
      }
      done = true;
      const injected = injectGrokPwaHead(buffer, ctx);
      buffer = "";
      return [encoder.encode(injected)];
    },
    flush() {
      if (!buffer) return [];
      const out = done ? buffer : injectGrokPwaHead(buffer, ctx);
      buffer = "";
      return [encoder.encode(out)];
    },
  };
}
