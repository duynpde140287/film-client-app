import { useEffect, useState, type FormEvent } from "react";
import {
  NavLink,
  Routes,
  Route,
  useLocation,
  Navigate,
  Link,
} from "react-router-dom";
import {
  Layers3,
  LayoutDashboard,
  FolderKanban,
  Blocks,
  Cable,
  Users,
  Activity,
  ShieldCheck,
  Menu,
  LogOut,
  ArrowRight,
  Sparkles,
  Check,
  PanelLeftClose,
} from "lucide-react";
import { api, deviceId, getSession, saveSession } from "./api";
import type { Session, User } from "./types";
import { ErrorBox, Field, Spinner } from "./ui";
import { Overview, Projects } from "./Overview";
import { Templates } from "./Templates";
import { Workspace } from "./Workspace";
import { AdminUsers, Audit, Connections } from "./Admin";

function Login({ admin }: { admin: boolean }) {
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
      if (admin && session.user.role !== "ADMIN")
        throw Error("Tài khoản này không có quyền quản trị.");
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
            <Layers3 size={24} />
          </span>{" "}
          storyflow<span className="brand-dot">.</span>
        </Link>
        <div className="login-copy">
          <span className="eyebrow">KHÔNG GIAN SÁNG TẠO CỦA BẠN</span>
          <h1>
            Một ý tưởng.
            <br />
            Vô vàn câu chuyện.
          </h1>
          <p>
            Biến kiến thức, câu chuyện và sản phẩm thành nội dung của riêng bạn.
            Để quy trình tự động lo phần còn lại.
          </p>
          <div className="creative-orbit">
            <div className="orbit-card orbit-a">
              <Blocks />
              <span>Template của bạn</span>
              <small>Một khuôn mẫu, nhiều ý tưởng</small>
            </div>
            <div className="orbit-card orbit-b">
              <Sparkles />
              <span>Sáng tạo liền mạch</span>
              <small>Từ nội dung đến video</small>
            </div>
            <div className="orbit-center">
              <Layers3 size={48} />
            </div>
            <i className="orbital-ring" />
          </div>
        </div>
        <span className="login-foot">Content studio · Web & Desktop</span>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="tag">
            {admin ? "ADMIN CONSOLE" : "CREATOR WORKSPACE"}
          </span>
          <h2>{admin ? "Quản lý không gian sáng tạo" : "Chào mừng trở lại"}</h2>
          <p>Đăng nhập bằng tài khoản được quản trị viên cấp.</p>
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
                  Vào {admin ? "trang quản trị" : "Studio"}{" "}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="login-note">
            <ShieldCheck size={16} /> Tài khoản, thiết bị và thời hạn được xác
            thực khi đăng nhập.
          </p>
          <Link
            className="text-link"
            to={admin ? "/" : "/admin"}
            onClick={() => {
              location.href = admin ? "/" : "/admin";
            }}
          >
            {admin ? "Trở về Studio khách hàng" : "Dành cho quản trị viên"}{" "}
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
export function App() {
  const admin = location.pathname.startsWith("/admin");
  const [session, setSession] = useState(getSession);
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
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
  if (!session) return <Login admin={admin} />;
  if (admin && session.user.role !== "ADMIN")
    return (
      <div className="empty">
        <ShieldCheck />
        <h2>Cần tài khoản quản trị viên</h2>
        <button className="button" onClick={() => saveSession(null)}>
          Đổi tài khoản
        </button>
      </div>
    );
  const links = admin
    ? [
        { to: "/admin", label: "Khách hàng", icon: Users, end: true },
        { to: "/admin/templates", label: "Hỗ trợ template", icon: Blocks },
        { to: "/admin/connections", label: "Tình trạng hệ thống", icon: Cable },
        { to: "/admin/audit", label: "Nhật ký hoạt động", icon: Activity },
      ]
    : [
        { to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true },
        { to: "/projects", label: "Dự án của tôi", icon: FolderKanban },
        { to: "/templates", label: "Template Studio", icon: Blocks },
        { to: "/connections", label: "Kết nối dịch vụ", icon: Cable },
      ];
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
    } catch {}
    saveSession(null);
  }
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
        <Link className="brand" to={admin ? "/admin" : "/"}>
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          storyflow<span className="brand-dot">.</span>
        </Link>
        <div className="workspace-switch">
          <div className="workspace-icon">
            {admin ? <ShieldCheck size={19} /> : <Sparkles size={19} />}
          </div>
          <div>
            <strong>{admin ? "Admin Console" : "Creative Studio"}</strong>
            <small>{admin ? "Quản trị hệ thống" : "Không gian cá nhân"}</small>
          </div>
          <button
            className="mobile-only icon-button"
            onClick={() => setMobile(false)}
            aria-label="Đóng thanh bên"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <span className="nav-label">
          {admin ? "QUẢN TRỊ" : "KHÔNG GIAN LÀM VIỆC"}
        </span>
        <nav>
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <item.icon size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="studio-tip">
            <span className="tip-icon">
              <Sparkles size={17} />
            </span>
            <strong>Ý tưởng không giới hạn</strong>
            <p>Giáo dục, thương hiệu, phim ảnh và nhiều hơn thế.</p>
          </div>
          <div className="account">
            <span className="avatar">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{session.user.name}</strong>
              <small>
                {session.user.role === "ADMIN"
                  ? "Quản trị viên"
                  : "Nhà sáng tạo"}
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
            <span>{admin ? "Quản trị" : "Không gian làm việc"}</span>
            <span className="crumb-slash">/</span>
            <strong>
              {route.pathname.includes("/projects/")
                ? "Dự án"
                : links.find((l) => l.to === route.pathname)?.label || "Studio"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="server-label">
              <i /> Studio workspace
            </span>
            <span className="avatar small">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Overview user={session.user} />} />
            <Route path="/projects" element={<Projects notify={setToast} />} />
            <Route
              path="/projects/:id"
              element={<Workspace notify={setToast} />}
            />
            <Route
              path="/templates"
              element={<Templates notify={setToast} />}
            />
            <Route path="/connections" element={<Connections />} />
            <Route path="/admin" element={<AdminUsers notify={setToast} />} />
            <Route
              path="/admin/templates"
              element={<Templates notify={setToast} admin />}
            />
            <Route path="/admin/connections" element={<Connections admin />} />
            <Route path="/admin/audit" element={<Audit />} />
            <Route
              path="*"
              element={<Navigate to={admin ? "/admin" : "/"} replace />}
            />
          </Routes>
        </main>
        <footer className="app-footer">
          <span>storyflow studio</span>
          <span>Ý tưởng của bạn, quy trình của chúng tôi.</span>
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
