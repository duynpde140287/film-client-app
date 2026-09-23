import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, LogIn } from 'lucide-react';
import { api } from '../api';
import { useAiLogin } from '../hooks/useAiLogin';

type Connection = {
  provider: string; label: string; connected: boolean; status: string; message?: string;
  browser?: 'Chrome' | 'Edge' | null;
  usage?: { remainingPercent: number | null };
};
const supported = (rows: Connection[]) => rows.filter(row => ['gemini', 'chatgpt', 'veo3', 'notebooklm', 'onimivoice'].includes(row.provider));
const groups = [
  { id: 'google', label: 'Google', loginProvider: 'gemini', services: ['gemini', 'veo3', 'notebooklm'] },
  { id: 'chatgpt', label: 'ChatGPT', loginProvider: 'chatgpt', services: ['chatgpt'] },
  { id: 'onimivoice', label: 'OmniVoice', loginProvider: 'onimivoice', services: ['onimivoice'] },
];

function AccountStatus({ connection }: { connection: Connection }) {
  return <div className="ai-account-status" data-provider={connection.provider}>
    <span className={connection.connected ? 'ai-status-connected' : 'ai-status-missing'}>
      {connection.connected ? <Wifi size={15} /> : <WifiOff size={15} />}
      {connection.connected ? 'Đã đăng nhập' : 'Chưa đăng nhập'}
    </span>
    {!connection.connected && connection.message && <small>{connection.message}</small>}
    {connection.connected && <small>Phiên đang dùng: {connection.browser || 'chưa xác định'}</small>}
    <small>{connection.usage?.remainingPercent == null ? 'Usage: chưa có dữ liệu' : `Còn ${connection.usage.remainingPercent}%`}</small>
  </div>;
}

export function AiConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const { attempt, login, cancel, busy: loginBusy, error: loginError } = useAiLogin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => {
      api<Connection[]>('/ai-sessions').then(rows => { if (active) setConnections(supported(rows)); })
        .catch(e => { if (active) setError(e.message); });
    };
    refresh();
    window.addEventListener('ai-status-change', refresh);
    return () => { active = false; window.removeEventListener('ai-status-change', refresh); };
  }, []);

  async function check() {
    setBusy(true); setError('');
    try {
      const rows = await api<Connection[]>('/ai-sessions/check', 'POST', {});
      setConnections(supported(rows));
      window.dispatchEvent(new Event('ai-status-change'));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="settings-card settings-card-wide">
    <div className="settings-card-title">
      <h2>Tài khoản AI trên trình duyệt</h2>
      <button className="button compact" disabled={busy || loginBusy} onClick={() => void check()}>
        <RefreshCw size={16} />{busy ? 'Đang kiểm tra' : 'Kiểm tra lại'}
      </button>
    </div>
    {(error || loginError) && <div className="error-box" role="alert">{error || loginError}</div>}
    <div className="provider-list">{groups.map(group => {
      const services = connections.filter(row => group.services.includes(row.provider));
      if (!services.length) return null;
      const connected = services.some(row => row.connected);
      return <div className={'provider-card ai-account-group ' + (connected ? 'is-connected' : '')} key={group.id} data-account-group={group.id}>
        <div className="ai-account-heading">
          <strong>{group.label}</strong>
          {!connected && <button className="button compact" disabled={busy || loginBusy} onClick={() => { setError(''); void login(group.loginProvider); }}>
            <LogIn size={16} />Đăng nhập
          </button>}
        </div>
        {services.map(connection => <div className="ai-account-service" key={connection.provider}>
          {services.length > 1 && <span>{connection.label.replace(' (Google)', '')}</span>}
          <AccountStatus connection={connection} />
        </div>)}
      </div>;
    })}</div>
    {attempt && <div role="status" className="provider-login-status">
      {attempt.message || 'Đang chờ đăng nhập trên trình duyệt.'}
      <button className="button compact" onClick={() => void cancel()}>Hủy kiểm tra</button>
    </div>}
  </section>;
}
