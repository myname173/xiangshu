export type Language = "zh" | "en";

export type LatexTemplate = "billryan" | "awesomeCv" | "moderncv" | "itemize";

export type RepoSummary = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  topics: string[];
  htmlUrl: string;
  private: boolean;
  defaultBranch: string;
};

export type ProjectBrief = {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  homepage: string | null;
  htmlUrl: string;
  language: string | null;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  defaultBranch: string;
  topFiles: string[];
  readme: string;
  commitMessages: string[];
};

export type ResumeBullet = {
  text: string;
  keywords: string[];
  metrics: string[];
  needsQuantification: boolean;
  interviewQuestion: string;
};

export type JdHit = {
  keyword: string;
  covered: boolean;
};

export type ResumeDraft = {
  projectTitle: string;
  role: string;
  period: string;
  organization: string;
  stack: string[];
  oneLiner: string;
  bullets: ResumeBullet[];
  jdHits: JdHit[];
  gaps: string[];
  interviewPrep: string[];
  researchNotes: string[];
};

export type LatexBundle = {
  billryan: string;
  awesomeCv: string;
  moderncv: string;
  itemize: string;
  standalone: string;
};

export type ResumeResult = ResumeDraft & {
  markdown: string;
  latex: LatexBundle;
  generatedAt: string;
  engine: "model" | "rules";
};

export type HistoryItem = {
  id: string;
  createdAt: string;
  repoFullName: string;
  roleTitle: string;
  result: ResumeResult;
};
