export interface ITemplateSourceFile {
  filename: string;
  size: number;
  characters: number;
  sha256: string;
  encoding: string;
  importedAt: string;
}

export interface ITemplateSourceImage {
  filename: string;
  size: number;
  sha256: string;
  mime: string;
  importedAt: string;
}

export interface ITemplateSourceVideo {
  url: string;
  hostname: string;
  provider: "gemini";
  importedAt: string;
}

export interface ITemplateInput {
  sourceFiles?: {
    content?: ITemplateSourceFile;
    style?: ITemplateSourceFile;
    styleImages?: ITemplateSourceImage[];
    sourceVideo?: ITemplateSourceVideo;
  };
  sourceVideoUrl?: string;
  customerIdea?: string;
  sourceContent?: Record<string, unknown>;
  formulaOutputJson?: Record<string, unknown>;
  formulaValues?: Record<string, unknown>;
  templateBuildStages?: Record<string, unknown>[];
  managedProvider?: Record<string, unknown>;
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

export interface ITemplateVersion {
  input?: ITemplateInput;
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

export interface ITemplate {
  id: string;
  name: string;
  input: ITemplateInput;
  status: string;
  sceneCount: number;
  currentVersion: number;
  versions: ITemplateVersion[];
  createdAt: string;
  ownerId?: string;
}

/** Giữ aliases cho tương thích ngược */
export type TemplateSourceFile = ITemplateSourceFile;
export type TemplateSourceImage = ITemplateSourceImage;
export type TemplateSourceVideo = ITemplateSourceVideo;
export type TemplateInput = ITemplateInput;
export type TemplateVersion = ITemplateVersion;
export type Template = ITemplate;