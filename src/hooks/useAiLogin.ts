import { useEffect, useState } from 'react';
import { api, getSession } from '../api';

type Attempt = { id: string; status: string; message?: string; expiresAt?: number };

function attemptKey() { return `filmx.ai-login:${getSession()?.user.id || 'anonymous'}`; }
function readAttempt(): Attempt | null {
  try {
    const value = JSON.parse(localStorage.getItem(attemptKey()) || 'null');
    return value?.status === 'PENDING' && value.expiresAt > Date.now() ? value : null;
  } catch { return null; }
}

export function useAiLogin() {
  const [attempt, setAttempt] = useState<Attempt | null>(readAttempt);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (attempt) localStorage.setItem(attemptKey(), JSON.stringify(attempt));
      else localStorage.removeItem(attemptKey());
    } catch { /* A storage limit does not cancel browser login. */ }
  }, [attempt]);

  useEffect(() => {
    if (!attempt) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 310000;
    const poll = async () => {
      try {
        const next = await api<Attempt>('/provider-logins/' + attempt.id);
        if (!active) return;
        if (next.status === 'PENDING' && Date.now() < deadline) {
          setAttempt(next);
          timer = setTimeout(poll, 2000);
          return;
        }
        if (next.status !== 'CONNECTED') setError(next.message || 'Chưa hoàn tất đăng nhập AI.');
        await api('/ai-sessions');
        window.dispatchEvent(new Event('ai-status-change'));
        if (active) setAttempt(null);
      } catch (e) {
        if (active) { setAttempt(null); setError((e as Error).message); }
      }
    };
    timer = setTimeout(poll, 1000);
    return () => { active = false; clearTimeout(timer); };
  }, [attempt?.id]);

  async function login(provider: string) {
    if (starting || attempt) return;
    setStarting(true); setError('');
    try { setAttempt(await api<Attempt>('/provider-logins', 'POST', { provider })); }
    catch (e) { setError((e as Error).message); }
    finally { setStarting(false); }
  }

  async function cancel() {
    if (!attempt) return;
    try { await api('/provider-logins/' + attempt.id, 'DELETE'); setAttempt(null); }
    catch (e) { setError((e as Error).message); }
  }

  return { login, cancel, attempt, busy: starting || !!attempt, error };
}
