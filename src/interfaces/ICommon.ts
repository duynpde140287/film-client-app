import { IProject } from './IProject';

export interface IProvider {
  provider: string;
  label: string;
  status: string;
  available: boolean;
  description: string;
}

export interface IActivity {
  id: string;
  action: string;
  createdAt: string;
  userId?: string;
  details?: Record<string, unknown>;
}

export interface IDashboard {
  stats: {
    projects: number;
    templates: number;
    completed: number;
    activeJobs: number;
  };
  projects: IProject[];
  recentActivity: IActivity[];
  mode: string;
}

export interface IAiSession {
  provider: 'chatgpt' | 'veo3' | 'youtube' | 'capcut';
  connected: boolean;
  connectedAt: string | null;
  label: string | null;
}

/** Giữ aliases cho tương thích ngược */
export type Provider = IProvider;
export type Activity = IActivity;
export type Dashboard = IDashboard;
export type AiSession = IAiSession;
