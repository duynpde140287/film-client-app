export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  enabled: boolean;
  licenseStatus?: string;
  activeFrom: string;
  expiresAt: string;
  deviceId?: string;
}
export interface Session {
  token: string;
  refreshToken: string;
  user: User;
}
export interface Readiness {
  ready: boolean;
  reasons: string[];
}
export interface Job {
  id: string;
  kind: string;
  sceneIndex?: number;
  status: string;
  attempts: number;
  duration?: number;
  url?: string;
  error?: { code: string; message: string };
}
export interface Step {
  stepNo: number;
  name: string;
  status: string;
  version: number;
  readiness: Readiness;
  inputSuggestion: string;
  output?: Record<string, any>;
  error?: { message: string };
  history: { version: number; createdAt: string }[];
}
export interface Scene {
  index: number;
  chapter: number;
  description: string;
  characters: string[];
  voiceText?: string;
  prompt?: string;
  assets: Record<string, Job>;
}
export interface QC {
  status: string;
  errors: {
    code: string;
    message?: string;
    sceneIndex?: number;
    kind?: string;
  }[];
  missing: { sceneIndex: number; kind: string }[];
  warnings: string[];
  checkedAt: string;
}
export interface Project {
  id: string;
  name: string;
  rawStory: string;
  status: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  sceneCount: number;
  sceneDurationSeconds: number;
  automationStatus: string;
  automationError?: { message: string };
  mode: string;
  steps: Step[];
  scenes: Scene[];
  jobs: Job[];
  exports: Job[];
  qc?: QC;
  progress: Record<string, { done: number; total: number }>;
  actions: Record<string, Readiness>;
  createdAt: string;
  updatedAt: string;
}
export interface TemplateInput {
  name: string;
  domain: string;
  requirements: string;
  style: string;
  language: string;
  durationSeconds: number;
  sceneDurationSeconds: number;
  chapterCount: number;
  reference?: string;
}
export interface TemplateVersion {
  version: number;
  published: boolean;
  formula: Record<string, any>;
  config: Record<string, any>;
  variables: {
    key: string;
    value: unknown;
    status: string;
    source: string;
    usedBySteps: number[];
  }[];
  children: { step: number; name: string; content: string; hash: string }[];
  validation: { valid: boolean; errors: { code: string; key: string }[] };
}
export interface Template {
  id: string;
  name: string;
  input: TemplateInput;
  status: string;
  sceneCount: number;
  currentVersion: number;
  versions: TemplateVersion[];
  createdAt: string;
  ownerId?: string;
}
export interface Provider {
  provider: string;
  label: string;
  status: string;
  available: boolean;
  description: string;
}
export interface Activity {
  id: string;
  action: string;
  createdAt: string;
  userId?: string;
  details?: Record<string, unknown>;
}
export interface Dashboard {
  stats: {
    projects: number;
    templates: number;
    completed: number;
    activeJobs: number;
  };
  projects: Project[];
  recentActivity: Activity[];
  mode: string;
}

/** Trạng thái kết nối session AI (ChatGPT, Veo3, CapCut) của user */
export interface AiSession {
  provider: "chatgpt" | "veo3" | "capcut";
  connected: boolean;
  connectedAt: string | null;
  label: string | null;
}
