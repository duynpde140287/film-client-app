export interface IReadiness {
  ready: boolean;
  reasons: string[];
}

export interface IJob {
  id: string;
  kind: string;
  sceneIndex?: number;
  status: string;
  attempts: number;
  duration?: number;
  url?: string;
  error?: { code: string; message: string };
}

export interface IStep {
  stepNo: number;
  name: string;
  status: string;
  version: number;
  readiness: IReadiness;
  inputSuggestion: string;
  inputSources: number[];
  childFile?: string;
  output?: Record<string, any>;
  error?: { message: string };
  history: { version: number; createdAt: string }[];
}

export interface IScene {
  index: number;
  chapter: number;
  description: string;
  characters: string[];
  voiceText?: string;
  prompt?: string;
  assets: Record<string, IJob>;
}

export interface IQC {
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

export interface IProject {
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
  automationScope?: 'project' | 'scripts';
  automationTarget?: number;
  suggestedStep: number;
  automationError?: { message: string };
  mode: string;
  steps: IStep[];
  scenes: IScene[];
  jobs: IJob[];
  exports: IJob[];
  qc?: IQC;
  progress: Record<string, { done: number; total: number }>;
  actions: Record<string, IReadiness>;
  createdAt: string;
  updatedAt: string;
}

/** Giữ aliases cho tương thích ngược */
export type Readiness = IReadiness;
export type Job = IJob;
export type Step = IStep;
export type Scene = IScene;
export type QC = IQC;
export type Project = IProject;
