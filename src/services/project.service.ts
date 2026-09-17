import { api } from './api.service';
import type { IProject, IStep, IJob, IScene, IQC } from '../interfaces';

export async function getProjects(): Promise<IProject[]> {
  return api<IProject[]>('/projects');
}

export async function getProject(id: string): Promise<IProject> {
  return api<IProject>(`/projects/${id}`);
}

export async function createProject(payload: {
  name: string;
  templateId: string;
  rawStory: string;
}): Promise<IProject> {
  return api<IProject>('/projects', 'POST', payload);
}

export async function runStep(
  projectId: string,
  stepNo: number,
  inputOverride?: string,
): Promise<IStep> {
  return api<IStep>(`/projects/${projectId}/steps/${stepNo}/run`, 'POST', {
    inputOverride,
  });
}

export async function retryStep(
  projectId: string,
  stepNo: number,
  inputOverride?: string,
): Promise<IStep> {
  return api<IStep>(`/projects/${projectId}/steps/${stepNo}/retry`, 'POST', {
    inputOverride,
  });
}

export async function automateProject(projectId: string): Promise<IProject> {
  return api<IProject>(`/projects/${projectId}/run`, 'POST', {});
}

export async function runScripts(projectId: string, target = 'scripts'): Promise<IProject> {
  return api<IProject>(`/projects/${projectId}/scripts/run`, 'POST', { target });
}

export async function pauseProject(projectId: string): Promise<IProject> {
  return api<IProject>(`/projects/${projectId}/pause`, 'POST', {});
}

export async function queueMedia(
  projectId: string,
  kind: string,
  sceneIndex?: number,
): Promise<IJob> {
  return api<IJob>(`/projects/${projectId}/media/${kind}`, 'POST', { sceneIndex });
}

export async function retryJob(projectId: string, assetId: string): Promise<IJob> {
  return api<IJob>(`/projects/${projectId}/media/${assetId}/retry`, 'POST', {});
}

export async function qcProject(projectId: string): Promise<IQC> {
  return api<IQC>(`/projects/${projectId}/qc`, 'POST', {});
}

export async function exportFilm(projectId: string): Promise<IJob> {
  return api<IJob>(`/projects/${projectId}/export`, 'POST', {});
}

export async function getProjectJobs(projectId: string): Promise<IJob[]> {
  return api<IJob[]>(`/projects/${projectId}/jobs`);
}

export async function getProjectExports(projectId: string): Promise<IJob[]> {
  return api<IJob[]>(`/projects/${projectId}/exports`);
}

export async function getProjectScenes(projectId: string): Promise<IScene[]> {
  return api<IScene[]>(`/projects/${projectId}/scenes`);
}
