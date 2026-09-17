import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { api } from "../api";

type Connection = { provider: string; label: string; connected: boolean; description?: string };
type Attempt = { id: string; status: string; message?: string };
export function AiConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<Connection[]>("/ai-sessions").then(rows => {
      if (active) setConnections(rows.filter(r => ["gemini", "onimivoice", "chatgpt", "veo3"].includes(r.provider)));
    })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    if (!attempt) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await api<Attempt>("/provider-logins/" + attempt.id);
        if (!active) return;
        if (next.status === "PENDING") { timer = setTimeout(poll, 2000); return; }
        setAttempt(null);
        if (next.status === "CONNECTED") { setRevision(n => n + 1); setMessage("Đăng nhập thành công."); }
        else setError(next.message || "Đăng nhập thất bại.");
      } catch (e) { if (active) { setAttempt(null); setError((e as Error).message); } }
    };
    timer = setTimeout(poll, 1500);
    return () => { active = false; clearTimeout(timer); };
  }, [attempt?.id]);
  async function login(provider: string) {
    setBusy(true); setError(""); setMessage("");
    try { setAttempt(await api<Attempt>("/provider-logins", "POST", { provider })); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function openBrowser(provider: string) {
    setError(''); setMessage('');
    try { await api('/provider-logins/open-browser', 'POST', {provider}); setMessage('Đăng nhập trên trình duyệt, rồi nhập file cookie JSON để xác minh.'); }
    catch(e) { setError((e as Error).message); }
  }
  async function importSession(provider: string, file?: File) {
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (file.size > 262144) throw new Error('File cookie tối đa 256 KB.');
      const session = await file.text();
      JSON.parse(session);
      await api('/provider-logins/verify', 'POST', {provider, session});
      setRevision(n => n + 1); setMessage('Liên kết thành công.');
    } catch(e) { setError(e instanceof SyntaxError ? 'Chọn file cookie JSON hợp lệ.' : (e as Error).message); }
    finally { setBusy(false); }
  }
  async function disconnect(provider: string) {
    setBusy(true); setError("");
    try { await api("/ai-sessions/remove", "POST", { provider }); setRevision(n => n + 1); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!attempt) return;
    try { await api("/provider-logins/" + attempt.id, "DELETE"); setAttempt(null); }
    catch (e) { setError((e as Error).message); }
  }
  return <section className="settings-card settings-card-wide">
    <h2>Liên kết AI</h2>
    {error && <div className="error-box" role="alert">{error}</div>}
    {message && <div className="settings-alert success" role="status">{message}</div>}
    <div className="provider-list">{connections.map(connection =>
      <div className={"provider-card " + (connection.connected ? "is-connected" : "")} key={connection.provider}>
        <div className="provider-main">
          {connection.connected ? <Wifi size={17}/> : <WifiOff size={17}/>}
          <div>
            <strong>{connection.label}</strong>
            {connection.description && <span style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginTop: 2 }}>{connection.description}</span>}
            <span style={{ fontSize: "0.78rem", color: connection.connected ? "#4ade80" : "#f87171" }}>{connection.connected ? "● Đã kết nối" : "○ Chưa kết nối"}</span>
          </div>
        </div>
        <div className="provider-actions">
          <button className="button compact" disabled={busy || !!attempt} onClick={() => void login(connection.provider)}>{connection.connected ? "Đăng nhập lại" : "Đăng nhập"}</button>
          {connection.connected && <button className="button compact" disabled={busy || !!attempt} onClick={() => void disconnect(connection.provider)}>Ngắt</button>}
        </div>
      </div>)}</div>
    <details className="provider-login-fallback">
      <summary>Trình duyệt chặn đăng nhập?</summary>
      <p>Đăng nhập bằng Chrome/Edge thường, xuất cookie JSON bằng J2TEAM rồi nhập để xác minh.</p>
      {connections.map(connection => <div className="provider-card" key={connection.provider}>
        <strong>{connection.label}</strong>
        <div className="provider-actions">
          <button className="button compact" disabled={busy || !!attempt} onClick={() => void openBrowser(connection.provider)}>Mở trình duyệt</button>
          <label className="button compact">Nhập cookie JSON
            <input type="file" accept=".json,application/json" hidden disabled={busy || !!attempt} onChange={event => { const file=event.target.files?.[0]; event.target.value=''; void importSession(connection.provider,file); }}/>
          </label>
        </div>
      </div>)}
      {busy && <p role="status">Đang xác minh…</p>}
    </details>
    {attempt && <div role="status" className="provider-login-status">
      Hoàn tất đăng nhập trong cửa sổ trình duyệt.
      <button className="button compact" onClick={() => void cancel()}>Hủy</button>
    </div>}
  </section>;
}

