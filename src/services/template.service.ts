import { api, upload } from './api.service';
import type { ITemplate, ITemplateInput, ITemplateVersion } from '../interfaces';

export async function getTemplates(): Promise<ITemplate[]> {
  return api<ITemplate[]>('/templates');
}

export async function getTemplate(id: string): Promise<ITemplate> {
  return api<ITemplate>(`/templates/${id}`);
}

export async function createTemplate(payload: Partial<ITemplateInput>): Promise<ITemplate> {
  return api<ITemplate>('/templates', 'POST', payload);
}

export async function updateTemplate(
  id: string,
  payload: Partial<ITemplateInput>,
): Promise<ITemplate> {
  return api<ITemplate>(`/templates/${id}`, 'PATCH', payload);
}

export async function importTemplate(
  formData: FormData,
  templateId?: string,
): Promise<ITemplate> {
  const path = templateId ? `/templates/${templateId}/import` : '/templates/import';
  const method = templateId ? 'PATCH' : 'POST';
  return upload<ITemplate>(path, method, formData);
}

export async function buildTemplate(id: string): Promise<ITemplate> {
  return api<ITemplate>(`/templates/${id}/build`, 'POST', {});
}

export async function publishTemplate(id: string): Promise<ITemplate> {
  return api<ITemplate>(`/templates/${id}/publish`, 'POST', {});
}

export async function getTemplateVersions(id: string): Promise<ITemplateVersion[]> {
  return api<ITemplateVersion[]>(`/templates/${id}/versions`);
}

export async function getImportPolicy(): Promise<{
  accept: string;
  maxBytes: number;
  maxCharacters: number;
  hint: string;
}> {
  return api('/template-import-policy');
}
