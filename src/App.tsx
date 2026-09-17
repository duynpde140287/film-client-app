import { AiConnections } from './components/AiConnections';
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
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Wifi,
  WifiOff,
  Bot,
  Clapperboard,
} from "lucide-react";
import { api, deviceId, getSession, saveSession } from "./api";
import type { Session, User, Project } from "./types";
import { ErrorBox, Field, Spinner } from "./ui";
import { Overview, Projects } from "./Overview";
import { Templates } from "./Templates";
import { Workspace } from "./Workspace";
import { ExternalSessionPage } from "./ExternalSession";
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
    const username = String(values.get("username") || values.get("email") || "").trim();
    const pw = String(values.get("password") || "");
    if (!username) {
      setError("Vui lòng nhập tài khoản.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await api<Session>("/auth/login", "POST", {
        username,
        password: pw,
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
          <span className="eyebrow">CONTENT AUTOMATION</span>
          <h1>
            Ý tưởng của bạn.
            <br />
            AI lo phần còn lại.
          </h1>
          <p>
            Tạo nội dung, hình ảnh, giọng đọc và video tự động.
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
        <span className="login-foot">Content Studio · Desktop App</span>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="tag">CREATOR WORKSPACE</span>
          <h2>Chào mừng trở lại</h2>
          <p>Đăng nhập bằng tài khoản được cấp.</p>
          <form onSubmit={submit}>
            <Field label="Tài khoản">
              <input
                name="username"
                type="text"
                placeholder="Nhập tài khoản của bạn"
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
            <Bot size={16} /> Kết nối ChatGPT/Veo 3 khi tạo ảnh và video.
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
];

function SidebarProjectItem({ project }: { project: Project | null }) {
  const projectId = project?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectRoute = location.pathname === "/projects/" + projectId;
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (isProjectRoute) setOpen(true);
  }, [isProjectRoute, projectId]);



  return (
    <div className="sidebar-active-project">
      <div className="active-project-header">
        <button
          className="active-project-name"
          disabled={!project}
          onClick={() => project && navigate("/projects/" + projectId)}
          title={project?.name || "Chưa mở dự án"}
        >
          <Clapperboard size={14} className="active-project-icon" />
          <span>{project?.name || "Dự án rỗng"}</span>
        </button>
        <button
          disabled={!project}
          className={`active-project-toggle ${open ? "is-expanded" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          title={open ? "Thu gọn" : "Xổ dự án"}
          aria-label={open ? "Thu gọn" : "Xổ dự án"}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {(open || !project) && (
        <div className="active-project-steps">
          {STEP_TABS.map((tab) => {
            const prog = project?.progress?.[tab.id];
            const done = prog?.done ?? 0;
            const total = prog?.total ?? 0;
            const complete = total > 0 && done === total;
            const isActive =
              location.pathname === "/projects/" + projectId &&
              (new URLSearchParams(location.search).get("tab") || "script") === tab.id;
            return (
              <button
                key={tab.id}
                disabled={!project}
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
      )}
    </div>
  );
}

/** ============================================================
 *  ACCOUNTS PAGE
 *  - ChatGPT + Veo3: tự động capture session qua NW.js browser window
 *  - CapCut: user tự lấy cookie thủ công rồi paste vào → hệ thống
 *            tự động push video vào CapCut khi xuất
 * ============================================================ */
function YouTubeUploadPage() {
  return <ExternalSessionPage provider="youtube" />;
}

function CapCutExportPage() {
  return <ExternalSessionPage provider="capcut" />;
}

type VoiceAllocation = {
  available: boolean;
  status: string;
  requiresUserLogin: boolean;
};

type AiConnection = {
  provider: "chatgpt" | "veo3" | string;
  label: string;
  loginUrl: string;
  connected: boolean;
  adapterAvailable?: boolean;
  status: string;
  description: string;
  savedAt?: string | null;
};

function SettingsPage() {
  const session = getSession();
  const [revision, setRevision] = useState(0);
  const [name, setName] = useState(session?.user.name || "");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const { data: gemini, error: geminiError } = useRemote<VoiceAllocation>('/provider-sessions/gemini', revision);
  const { data: voice, error: voiceError } = useRemote<VoiceAllocation>(
    "/provider-sessions/onimivoice",
    revision,
  );

  useEffect(() => {
    setName(getSession()?.user.name || "");
  }, [session?.user.id]);

  const user = session?.user;
  const expiryLabel =
    user?.expiresAt
        ? new Date(user.expiresAt).toLocaleDateString("vi-VN")
        : "Chưa có hạn";
  const statusLabel =
    user?.licenseStatus === "ACTIVE"
      ? "Đang dùng"
      : user?.licenseStatus === "EXPIRED"
        ? "Hết hạn"
        : user?.licenseStatus || "Không rõ";

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const current = getSession();
    if (!current) return;
    setBusy("profile");
    setError("");
    try {
      const nextUser = await api<User>("/auth/me", "PATCH", { name });
      saveSession({ ...current, user: nextUser });
      flash("Đã lưu tên.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("password");
    setError("");
    try {
      const next = await api<Session>("/auth/password", "POST", passwordForm);
      saveSession(next);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      flash("Đã đổi mật khẩu.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="page-heading settings-heading">
        <div>
          <span className="eyebrow">SETTINGS</span>
          <h1>Cài đặt</h1>
        </div>
      </div>
      <ErrorBox message={error || voiceError || geminiError} />
      {notice && (
        <div className="settings-alert success" role="status">
          <Check size={16} /> {notice}
        </div>
      )}
      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-title">
            <Settings size={18} />
            <div>
              <h2>Hồ sơ</h2>
            </div>
          </div>
          <form onSubmit={saveName} className="settings-form">
            <Field label="Tên của bạn">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên hiển thị"
                autoComplete="name"
                required
              />
            </Field>
            <button className="button primary" disabled={busy === "profile"}>
              {busy === "profile" ? <Spinner /> : <Check size={16} />} Lưu
            </button>
          </form>
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <ShieldStatus connected={true} />
            <div>
              <h2>Mật khẩu</h2>
            </div>
          </div>
          <form onSubmit={changePassword} className="settings-form">
            <Field label="Mật khẩu hiện tại">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="Mật khẩu mới">
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                autoComplete="new-password"
                required
              />
            </Field>
            <button className="button primary" disabled={busy === "password"}>
              {busy === "password" ? <Spinner /> : <Check size={16} />} Đổi
            </button>
          </form>
        </section>

        <section className="settings-card quota-card">
          <div className="settings-card-title">
            <AlertCircle size={18} />
            <div>
              <h2>Hạn mức</h2>
            </div>
          </div>
          <div className="quota-stack">
            <span className="quota-pill">{statusLabel}</span>
            <strong>{expiryLabel}</strong>
            <small>Tự khóa khi hết hạn</small>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-title">
            <Mic size={18} />
            <div>
              <h2>Omni Voice</h2>
            </div>
          </div>
          <div className="quota-stack">
            <span className="quota-pill">{voice?.available ? "Có session" : voice?.status === "EXPIRED" ? "Cần cập nhật session" : "Chưa có session"}</span>
            <strong>{voice?.available ? "Sẵn sàng sử dụng" : "Chờ cấu hình"}</strong>
            <small>Không cần đăng nhập riêng.</small>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-title"><Bot size={18} /><h2>Gemini</h2></div>
          <div className="quota-stack">
            <span className="quota-pill">{gemini?.available ? "Có session" : gemini?.status === "EXPIRED" ? "Cần cập nhật session" : "Chưa có session"}</span>
            <strong>Template và script</strong>
            <small>Dùng session hệ thống.</small>
          </div>
        </section>
        <AiConnections />
      </div>
    </>
  );
}

function ShieldStatus({ connected }: { connected: boolean }) {
  return connected ? <Wifi size={18} /> : <WifiOff size={18} />;
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
  }, [route.pathname, route.search]);
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

  useEffect(() => { setActiveProject(null); }, [session?.user.id]);

  if (!session) return <Login />;

  const licenseLabel =
    session.user.licenseStatus === "ACTIVE"
      ? "Đang hoạt động"
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
    { to: "/youtube-upload", label: "YouTube Upload", icon: Youtube },
    { to: "/capcut-export", label: "CapCut Export", icon: Scissors },
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/support", label: "Support", icon: HelpCircle },
  ];
  const breadcrumbLinks = [
    { to: "/templates", label: "Templates" },
    { to: "/projects", label: "Dự án" },
    ...mainNavLinks,
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

        <nav className="sidebar-templates-nav">
          <NavLink to="/templates" className={({isActive}) => "nav-link " + (isActive ? "active" : "")}>
            <FolderKanban size={18} /> Template
          </NavLink>
          <div className="sidebar-project-tree">
            <SidebarProjectItem project={route.pathname.startsWith('/projects/') && activeProject?.id !== route.pathname.split('/')[2] ? null : activeProject} />
          </div>
        </nav>

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
              {breadcrumbLinks.find((l) => route.pathname.startsWith(l.to))
                ?.label || "Workspace"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="server-label">
              <i /> ProjectX Studio
            </span>
            <span className="avatar small">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/templates" replace />} />
            <Route path="/accounts" element={<Navigate to="/settings" replace />} />
            <Route
              path="/templates"
              element={
                <Templates notify={setToast} onProjectCreated={setActiveProject} />
              }
            />
            <Route path="/template-studio" element={<Navigate to="/templates" replace />} />
            <Route path="/template-library" element={<Navigate to="/templates" replace />} />
            <Route path="/projects" element={<Projects notify={setToast} />} />
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
            <Route path="*" element={<Navigate to="/templates" replace />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <span>ProjectX Studio</span>
          <span>AI tự động · Dữ liệu của bạn.</span>
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

