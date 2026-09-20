import type { HistoryItem } from "./types";

const KEY = "xiangshu-history-v1";
const MAX = 20;

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HistoryItem =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as HistoryItem).id === "string" &&
        typeof (item as HistoryItem).createdAt === "string",
    );
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
}

export function pushHistory(item: HistoryItem): HistoryItem[] {
  const next = [item, ...loadHistory().filter((h) => h.id !== item.id)].slice(0, MAX);
  saveHistory(next);
  return next;
}

const FORM_KEY = "xiangshu-form-v1";

export type PersistedForm = {
  username: string;
  jd: string;
  roleTitle: string;
  language: "zh" | "en";
  template: "billryan" | "awesomeCv" | "moderncv" | "itemize";
  bulletCount: number;
  extraNotes: string;
  webSearch: boolean;
  period: string;
  organization: string;
  role: string;
};

export const defaultForm: PersistedForm = {
  username: "",
  jd: "",
  roleTitle: "",
  language: "zh",
  template: "billryan",
  bulletCount: 4,
  extraNotes: "",
  webSearch: true,
  period: "",
  organization: "",
  role: "",
};

export function loadForm(): PersistedForm {
  if (typeof window === "undefined") return defaultForm;
  try {
    const raw = localStorage.getItem(FORM_KEY);
    if (!raw) return defaultForm;
    return { ...defaultForm, ...(JSON.parse(raw) as Partial<PersistedForm>) };
  } catch {
    return defaultForm;
  }
}

export function saveForm(form: PersistedForm) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FORM_KEY, JSON.stringify(form));
}
