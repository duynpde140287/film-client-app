type AccountStatus = {
  provider: string;
  connected: boolean;
  source?: string | null;
  browser?: 'Chrome' | 'Edge' | null;
  checkedAt?: string | null;
};

// Browser profiles retain credentials. This cache records verified status and routing only.
export function cacheAiStatuses(userId: string | undefined, rows: AccountStatus[]) {
  if (!userId || !Array.isArray(rows)) return;
  try {
    localStorage.setItem(`filmx.ai-accounts:${userId}`, JSON.stringify(rows.map(row => ({
      provider: row.provider,
      status: row.connected ? 'CONNECTED' : 'DISCONNECTED',
      source: row.connected ? row.source || null : null,
      browser: row.connected ? row.browser || null : null,
      checkedAt: row.checkedAt || null,
    }))));
  } catch { /* Storage limits must not prevent signing in. */ }
}
