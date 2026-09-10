import { useEffect, useState, type FormEvent } from "react";
import {
  NavLink,
  Routes,
  Route,
  useLocation,
  Navigate,
  Link,
  useNavigate,
} from "react-router-dom";
import {
  Layers3,
  LayoutDashboard,
  FolderKanban,
  Blocks,
  Library,
  Youtube,
  Film,
  Settings,
  HelpCircle,
  Users,
  Menu,
  LogOut,
  ArrowRight,
  Sparkles,
  Check,
  PanelLeftClose,
  FileText,
  Mic,
  Image as ImageIcon,
  Video,
  Scissors,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Wifi,
  WifiOff,
  Bot,
  Clapperboard,
} from "lucide-react";
import { api, deviceId, getSession, saveSession } from "./api";
import type { Session, User, Project, AiSession } from "./types";
import { ErrorBox, Field, Spinner } from "./ui";
import { Overview, Projects } from "./Overview";
import { Templates } from "./Templates";
import { Workspace } from "./Workspace";
import { useRemote } from "./hooks";

/** ============================================================
 *  LOGIN PAGE
 * ============================================================ */
function Login() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const session = await api<Session>("/auth/login", "POST", {
        email: values.get("email"),
        password: values.get("password"),
        deviceId: deviceId(),
      });
      saveSession(session);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Clapperboard size={24} />
          </span>{" "}
          ProjectX<span className="brand-dot">.</span>film
        </Link>
        <div className="login-copy">
          <span className="eyebrow">CÔNG CỤ LÀM PHIM AI TỰ ĐỘNG</span>
          <h1>
            Ý tưởng của bạn.
            <br />
            AI lo phần còn lại.
          </h1>
          <p>
            Tự động tạo kịch bản, voice, hình ảnh và video với ChatGPT + Veo3.
            Bạn chỉ cần nhập ý tưởng.
          </p>
          <div className="creative-orbit">
            <div className="orbit-card orbit-a">
              <Bot />
              <span>ChatGPT</span>
              <small>Tự động viết kịch bản</small>
            </div>
            <div className="orbit-card orbit-b">
              <Clapperboard />
              <span>Veo3</span>
              <small>Generate video AI</small>
            </div>
            <div className="orbit-center">
              <Layers3 size={48} />
            </div>
            <i className="orbital-ring" />
          </div>
        </div>
        <span className="login-foot">AI Film Studio · Desktop App</span>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="tag">CREATOR WORKSPACE</span>
          <h2>Chào mừng trở lại</h2>
          <p>Đăng nhập bằng tài khoản được cấp bởi quản trị viên.</p>
          <form onSubmit={submit}>
            <Field label="Email">
              <input
                name="email"
                type="email"
                placeholder="ban@example.com"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Mật khẩu">
              <input
                name="password"
                type="password"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                required
              />
            </Field>
            <ErrorBox message={error} />
            <button className="button primary login-submit" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : (
                <>
                  Vào Studio <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="login-note">
            <Bot size={16} /> Sau khi vào, kết nối ChatGPT và Veo3 ở trang
            Accounts để bắt đầu tạo phim.
          </p>
        </div>
      </section>
    </div>
  );
}

/** ============================================================
 *  PROJECT STEP PROGRESS IN SIDEBAR
 *  Hiển thị dự án đang active + tiến trình từng bước
 * ============================================================ */
const STEP_TABS = [
  { id: "script", label: "Script", icon: FileText },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "capcut", label: "CapCut", icon: Scissors },
];

function ActiveProjectSteps({ projectId }: { projectId: string }) {
  const { data: project } = useRemote<Project>(
    "/projects/" + projectId,
    0,
    5000,
  );
  const navigate = useNavigate();
  const location = useLocation();

  if (!project) return null;

  return (
    <div className="sidebar-active-project">
      <button
        className="active-project-name"
        onClick={() => navigate("/projects/" + projectId)}
        title={project.name}
      >
        <ChevronDown size={13} />
        <span>{project.name}</span>
      </button>
      <div className="active-project-steps">
        {STEP_TABS.map((tab) => {
          const prog = project.progress[tab.id];
          const done = prog?.done ?? 0;
          const total = prog?.total ?? 0;
          const complete = total > 0 && done === total;
          const isActive = location.pathname.includes(
            "/projects/" + projectId,
          );
          return (
            <button
              key={tab.id}
              className={`project-step-row${complete ? " step-done" : ""}${isActive ? " step-active" : ""}`}
              onClick={() =>
                navigate("/projects/" + projectId + "?tab=" + tab.id)
              }
            >
              <span className="step-icon-wrap">
                {complete ? (
                  <Check size={12} className="step-check" />
                ) : (
                  <tab.icon size={13} />
                )}
              </span>
              <span>{tab.label}</span>
              {total > 0 && (
                <span className="step-fraction">
                  {done}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** ============================================================
 *  ACCOUNTS PAGE
 *  - ChatGPT + Veo3: tự động capture session qua NW.js browser window
 *  - CapCut: user tự lấy cookie thủ công rồi paste vào → hệ thống
 *            tự động push video vào CapCut khi xuất
 * ============================================================ */
function AccountsPage() {
  const { data: sessions, setData } = useRemote<AiSession[]>("/ai-sessions");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [capcutCookie, setCapcutCookie] = useState("");
  const [capcutLabel, setCapcutLabel] = useState("");

  // Kiểm tra xem đang chạy trong NW.js không
  const isDesktop = typeof window !== "undefined" && "nw" in window;

  /** Mở browser window NW.js, chờ user login, capture cookie tự động */
  async function connectAutoCapture(provider: "chatgpt" | "veo3") {
    setError("");
    if (!isDesktop) {
      setError("Tính năng này chỉ khả dụng trên ứng dụng desktop (npm run desktop).");
      return;
    }
    setBusy(provider);
    try {
      const url = provider === "chatgpt"
        ? "https://chatgpt.com"
        : "https://labs.google/fx/tools/video-fx";
      const nw = (window as any).nw;
      const win = nw.Window.open(url, {
        title: provider === "chatgpt" ? "Đăng nhập ChatGPT" : "Đăng nhập Google Veo3",
        width: 1024, height: 768, position: "center", new_instance: false,
      });
      const cookieName = provider === "chatgpt"
        ? "__Secure-next-auth.session-token"
        : "SSID";
      let attempts = 0;
      const poll = setInterval(async () => {
        if (++attempts > 120) {
          clearInterval(poll); setBusy(null);
          setError("Hết thời gian chờ. Vui lòng thử lại.");
          try { win.close(); } catch {}
          return;
        }
        try {
          const cookies = await nw.cookies.getAll({ url });
          const target = cookies.find((c: any) => c.name === cookieName);
          if (target) {
            clearInterval(poll);
            const result = await api("/ai-sessions", "POST", {
              provider, sessionCookie: target.value,
              label: target.domain || provider,
            });
            setData((prev) => prev
              ? prev.map((s) => s.provider === provider ? (result as AiSession) : s)
              : prev);
            setBusy(null);
            try { win.close(); } catch {}
          }
        } catch {}
      }, 1000);
      win.on("closed", () => { clearInterval(poll); setBusy(null); });
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  /** Lưu CapCut cookie thủ công do user paste vào */
  async function saveCapcutCookie() {
    if (!capcutCookie.trim()) {
      setError("Vui lòng dán cookie CapCut trước khi lưu.");
      return;
    }
    setError("");
    setBusy("capcut");
    try {
      const result = await api("/ai-sessions", "POST", {
        provider: "capcut",
        sessionCookie: capcutCookie.trim(),
        label: capcutLabel.trim() || "CapCut",
      });
      setData((prev) => prev
        ? prev.map((s) => s.provider === "capcut" ? (result as AiSession) : s)
        : [result as AiSession]);
      setCapcutCookie("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: "chatgpt" | "veo3" | "capcut") {
    setBusy(provider + "_remove");
    try {
      await api("/ai-sessions/remove", "POST", { provider });
      setData((prev) => prev
        ? prev.map((s) => s.provider === provider
          ? { ...s, connected: false, connectedAt: null, label: null }
          : s)
        : prev);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  type AutoProvider = { key: "chatgpt" | "veo3"; name: string; desc: string; icon: React.ReactNode; usedFor: string; };
  const autoProviders: AutoProvider[] = [
    {
      key: "chatgpt",
      name: "ChatGPT",
      desc: "Tự động tạo kịch bản (Script). Ứng dụng mở cửa sổ chatgpt.com, bạn đăng nhập, session được capture tự động.",
      icon: <Bot size={28} />,
      usedFor: "Script · Kịch bản",
    },
    {
      key: "veo3",
      name: "Google Veo3",
      desc: "Tự động generate video AI. Ứng dụng mở cửa sổ Veo3, bạn đăng nhập, session được capture tự động.",
      icon: <Film size={28} />,
      usedFor: "Video · Hình ảnh",
    },
  ];

  const capcutSession = sessions?.find((s) => s.provider === "capcut");

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TÀI KHOẢN AI</span>
          <h1>Kết nối dịch vụ AI</h1>
          <p>
            Hệ thống dùng session của bạn để tự động thao tác AI. Tài khoản
            AI là của bạn — chúng tôi không lưu mật khẩu.
          </p>
        </div>
      </div>

      {!isDesktop && (
        <div className="demo-note compact-note">
          <span className="tag">DESKTOP ONLY</span> ChatGPT & Veo3 chỉ tự
          động capture khi chạy desktop app (<code>npm run desktop</code>).
          CapCut hỗ trợ cả web và desktop.
        </div>
      )}

      <ErrorBox message={error} />

      {/* ── ChatGPT + Veo3: tự động capture ── */}
      <div className="accounts-grid">
        {autoProviders.map((p) => {
          const session = sessions?.find((s) => s.provider === p.key);
          const connected = session?.connected ?? false;
          const isBusy = busy === p.key || busy === p.key + "_remove";
          return (
            <div key={p.key} className={`account-card${connected ? " account-card--connected" : ""}`}>
              <div className="account-card-header">
                <span className={`account-icon ai-icon-${p.key}`}>{p.icon}</span>
                <div>
                  <h3>{p.name}</h3>
                  <span className="tag">{p.usedFor}</span>
                </div>
                <span className={`connection-badge${connected ? " connected" : " disconnected"}`}>
                  {connected ? <><Wifi size={14} /> Đã kết nối</> : <><WifiOff size={14} /> Chưa kết nối</>}
                </span>
              </div>
              <p className="account-desc">{p.desc}</p>
              {connected && session?.label && (
                <div className="account-info">
                  <span className="account-info-label">Phiên:</span>
                  <span>{session.label}</span>
                  {session.connectedAt && (
                    <span className="muted">· {new Date(session.connectedAt).toLocaleString("vi-VN")}</span>
                  )}
                </div>
              )}
              <div className="account-card-footer">
                {connected ? (
                  <>
                    <button className="button" disabled={isBusy} onClick={() => void connectAutoCapture(p.key)}>
                      {isBusy && busy === p.key ? <Spinner /> : <ArrowRight size={15} />} Kết nối lại
                    </button>
                    <button className="button danger" disabled={isBusy} onClick={() => void disconnect(p.key)}>
                      {isBusy && busy === p.key + "_remove" ? <Spinner /> : <WifiOff size={15} />} Ngắt
                    </button>
                  </>
                ) : (
                  <button className="button primary" disabled={isBusy || !isDesktop} onClick={() => void connectAutoCapture(p.key)}>
                    {isBusy ? <Spinner /> : <Wifi size={15} />} Kết nối {p.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* ── CapCut: paste cookie thủ công ── */}
        <div className={`account-card${capcutSession?.connected ? " account-card--connected" : ""}`}>
          <div className="account-card-header">
            <span className="account-icon ai-icon-capcut">
              <Scissors size={28} />
            </span>
            <div>
              <h3>CapCut</h3>
              <span className="tag">Video Export · Tự động push</span>
            </div>
            <span className={`connection-badge${capcutSession?.connected ? " connected" : " disconnected"}`}>
              {capcutSession?.connected
                ? <><Wifi size={14} /> Đã kết nối</>
                : <><WifiOff size={14} /> Chưa kết nối</>}
            </span>
          </div>
          <p className="account-desc">
            Khi xuất video, hệ thống tự động đưa project vào CapCut. Lấy
            session cookie từ trình duyệt (F12 → Application → Cookies →{" "}
            <code>capcut.com</code>) rồi paste vào đây.
          </p>
          {capcutSession?.connected && (
            <div className="account-info">
              <span className="account-info-label">Phiên:</span>
              <span>{capcutSession.label}</span>
              {capcutSession.connectedAt && (
                <span className="muted">· {new Date(capcutSession.connectedAt).toLocaleString("vi-VN")}</span>
              )}
            </div>
          )}
          <div className="account-manual-cookie">
            <label>Session Cookie (dán từ DevTools)</label>
            <textarea
              value={capcutCookie}
              onChange={(e) => setCapcutCookie(e.target.value)}
              placeholder="Paste toàn bộ cookie string từ F12 → Application → Cookies → capcut.com..."
              rows={3}
            />
            <input
              type="text"
              placeholder="Tên phiên (tùy chọn, ví dụ: tài khoản CapCut của bạn)"
              value={capcutLabel}
              onChange={(e) => setCapcutLabel(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
            />
          </div>
          <div className="account-card-footer">
            <button
              className="button primary"
              disabled={busy === "capcut" || !capcutCookie.trim()}
              onClick={() => void saveCapcutCookie()}
            >
              {busy === "capcut" ? <Spinner /> : <Check size={15} />} Lưu Cookie CapCut
            </button>
            {capcutSession?.connected && (
              <button
                className="button danger"
                disabled={busy === "capcut_remove"}
                onClick={() => void disconnect("capcut")}
              >
                {busy === "capcut_remove" ? <Spinner /> : <WifiOff size={15} />} Ngắt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Hướng dẫn ── */}
      <div className="accounts-how">
        <h3>Cách hoạt động</h3>
        <div className="how-steps">
          {[
            { num: "01", title: "ChatGPT & Veo3 — Tự động", desc: "Bấm Kết nối → ứng dụng mở browser → bạn đăng nhập → session được capture tự động." },
            { num: "02", title: "CapCut — Thủ công", desc: "Mở F12 trên trình duyệt tại capcut.com → Application → Cookies → copy toàn bộ → paste vào đây." },
            { num: "03", title: "Tạo kịch bản", desc: "Vào Template Library → chọn template → tạo dự án → hệ thống dùng ChatGPT để tạo script tự động." },
            { num: "04", title: "Xuất video → CapCut", desc: "Sau khi hoàn tất Script → Voice → Image → Video, xuất là hệ thống tự push vào CapCut." },
          ].map((s) => (
            <div key={s.num} className="how-step">
              <span className="how-num">{s.num}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** ============================================================
 *  PLACEHOLDER PAGES
 * ============================================================ */
function YouTubeUploadPage() {
  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">
        <Youtube size={48} />
      </span>
      <h2>YouTube Upload</h2>
      <p>Xuất và upload video trực tiếp lên kênh YouTube của bạn.</p>
      <span className="tag">Sắp ra mắt</span>
    </div>
  );
}

function CapCutExportPage() {
  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">
        <Scissors size={48} />
      </span>
      <h2>CapCut Export</h2>
      <p>Tự động push project vào CapCut để chỉnh sửa nâng cao.</p>
      <span className="tag">Sắp ra mắt</span>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">
        <Settings size={48} />
      </span>
      <h2>Cài đặt</h2>
      <p>Tùy chỉnh ứng dụng, ngôn ngữ, và preferences.</p>
      <span className="tag">Sắp ra mắt</span>
    </div>
  );
}

function SupportPage() {
  return (
    <div className="placeholder-page">
      <span className="placeholder-icon">
        <HelpCircle size={48} />
      </span>
      <h2>Hỗ trợ</h2>
      <p>Tài liệu hướng dẫn, FAQ và liên hệ hỗ trợ kỹ thuật.</p>
      <span className="tag">Sắp ra mắt</span>
    </div>
  );
}

/** ============================================================
 *  MAIN APP SHELL
 * ============================================================ */
const PLATFORMS = ["YouTube", "TikTok", "Facebook"] as const;
type Platform = (typeof PLATFORMS)[number];

export function App() {
  const [session, setSession] = useState(getSession);
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const [platform, setPlatform] = useState<Platform>("YouTube");
  const [platformOpen, setPlatformOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const route = useLocation();

  useEffect(() => {
    const change = () => setSession(getSession());
    window.addEventListener("sessionchange", change);
    return () => window.removeEventListener("sessionchange", change);
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [route.pathname]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (session)
      void api<User>("/auth/me")
        .then((user) => setSession((s) => (s ? { ...s, user } : null)))
        .catch(() => {});
  }, [session?.token]);

  if (!session) return <Login />;

  const licenseLabel =
    session.user.licenseStatus === "ACTIVE"
      ? "Không giới hạn"
      : session.user.licenseStatus === "EXPIRED"
        ? "Đã hết hạn"
        : session.user.licenseStatus === "SCHEDULED"
          ? "Chưa kích hoạt"
          : "Bị khóa";

  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
    } catch {}
    saveSession(null);
  }

  const mainNavLinks = [
    { to: "/accounts", label: "Accounts", icon: Users },
    { to: "/template-studio", label: "Template Studio", icon: Blocks },
    { to: "/template-library", label: "Template Library", icon: Library },
    { to: "/youtube-upload", label: "YouTube Upload", icon: Youtube },
    { to: "/capcut-export", label: "CapCut Export", icon: Scissors },
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/support", label: "Support", icon: HelpCircle },
  ];

  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobile(false)}
          aria-label="Đóng menu"
        />
      )}
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        {/* ── PLATFORM SWITCHER ── */}
        <div className="platform-switcher">
          <button
            className="platform-btn"
            onClick={() => setPlatformOpen((o) => !o)}
          >
            <Youtube size={18} />
            <span>{platform}</span>
            <ChevronDown size={14} className={platformOpen ? "rotated" : ""} />
          </button>
          {platformOpen && (
            <div className="platform-dropdown">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  className={p === platform ? "selected" : ""}
                  onClick={() => {
                    setPlatform(p);
                    setPlatformOpen(false);
                  }}
                >
                  {p === platform && <Check size={13} />} {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── ACTIVE PROJECT STEPS ── */}
        {activeProject && (
          <ActiveProjectSteps projectId={activeProject.id} />
        )}

        <div className="sidebar-divider" />

        {/* ── MAIN NAVIGATION ── */}
        <nav className="sidebar-main-nav">
          {mainNavLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* ── BOTTOM: Progress + Account ── */}
        <div className="sidebar-bottom">
          {/* License progress */}
          <div className="license-progress">
            <div className="license-bar-row">
              <span className="muted small-text">Progress</span>
            </div>
            <div className="license-bar">
              <span
                style={{
                  width:
                    session.user.licenseStatus === "ACTIVE" ? "100%" : "0%",
                }}
              />
            </div>
          </div>

          <div className="account">
            <span className="avatar">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{session.user.name}</strong>
              <small>{session.user.email}</small>
              <small className={`license-status-label license-${session.user.licenseStatus?.toLowerCase()}`}>
                {licenseLabel}
              </small>
            </div>
            <button
              className="icon-button"
              onClick={() => void logout()}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut size={17} />
            </button>
          </div>

          {/* Mobile close button */}
          <button
            className="mobile-only icon-button sidebar-mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Đóng thanh bên"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobile(true)}
              aria-label="Mở menu"
            >
              <Menu size={21} />
            </button>
            <span>Studio</span>
            <span className="crumb-slash">/</span>
            <strong>
              {mainNavLinks.find((l) => route.pathname.startsWith(l.to))
                ?.label || "Workspace"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="server-label">
              <i /> ProjectX Film Studio
            </span>
            <span className="avatar small">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/accounts" replace />}
            />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route
              path="/template-studio"
              element={
                <Templates notify={setToast} onProjectCreated={setActiveProject} />
              }
            />
            <Route
              path="/template-library"
              element={
                <Templates
                  notify={setToast}
                  libraryMode
                  onProjectCreated={setActiveProject}
                />
              }
            />
            <Route
              path="/projects"
              element={
                <Projects
                  notify={setToast}
                />
              }
            />
            <Route
              path="/projects/:id"
              element={
                <Workspace
                  notify={setToast}
                  onActivate={setActiveProject}
                />
              }
            />
            <Route path="/youtube-upload" element={<YouTubeUploadPage />} />
            <Route path="/capcut-export" element={<CapCutExportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="*" element={<Navigate to="/accounts" replace />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <span>ProjectX Film Studio</span>
          <span>AI tự động · Session của bạn · Phim của bạn.</span>
        </footer>
      </div>

      {toast && (
        <div className="toast" role="status">
          <Check size={19} />
          {toast}
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
