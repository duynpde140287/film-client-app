import { api, deviceId, saveSession } from './api.service';
import type { ISession, IUser, IAiSession } from '../interfaces';

export async function login(usernameOrEmail: string, password: string): Promise<ISession> {
  const session = await api<ISession>('/auth/login', 'POST', {
    username: usernameOrEmail,
    password,
    deviceId: deviceId(),
  });
  saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', 'POST', {});
  } finally {
    saveSession(null);
  }
}

export async function getMe(): Promise<IUser> {
  return api<IUser>('/auth/me');
}

export async function getAiSessions(): Promise<IAiSession[]> {
  return api<IAiSession[]>('/ai-sessions');
}

export async function saveAiSession(
  provider: 'chatgpt' | 'veo3' | 'youtube' | 'capcut',
  sessionCookie: string,
  label?: string,
): Promise<IAiSession[]> {
  return api<IAiSession[]>('/ai-sessions', 'POST', {
    provider,
    sessionCookie,
    label: label || '',
  });
}

export async function removeAiSession(provider: 'chatgpt' | 'veo3' | 'youtube' | 'capcut'): Promise<IAiSession[]> {
  return api<IAiSession[]>('/ai-sessions/remove', 'POST', { provider });
}
