import { useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  ShieldCheck,
  Users,
  KeyRound,
  Clock3,
  Cable,
  Activity,
  RefreshCw,
  Server,
  Check,
  LockKeyhole,
  UnlockKeyhole,
} from "lucide-react";
import { api } from "./api";
import { useRemote } from "./hooks";
import type { User, Provider, Activity as ActivityType } from "./types";
import {
  Badge,
  date,
  Empty,
  ErrorBox,
  Field,
  JsonView,
  Loading,
  Modal,
  Spinner,
} from "./ui";
export function AdminUsers({ notify }: { notify: (message: string) => void }) {
  const [revision, setRevision] = useState(0),
    [create, setCreate] = useState(false),
    [selected, setSelected] = useState<User>(),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { data, error: loadError } = useRemote<User[]>(
    "/admin/users",
    revision,
  );
  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/admin/users", "POST", {
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        days: Number(form.get("days")),
      });
      setCreate(false);
      setRevision((n) => n + 1);
      notify("Đã tạo tài khoản khách hàng.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function update(patch: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      setSelected(
        await api<User>("/admin/users/" + selected.id, "PATCH", patch),
      );
      setRevision((n) => n + 1);
      notify("Đã cập nhật tài khoản.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN CONSOLE</span>
          <h1>Khách hàng</h1>
          <p>Quản lý tài khoản, thiết bị và thời hạn sử dụng Studio.</p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setCreate(true);
            setError("");
          }}
        >
          <Plus size={18} /> Tạo tài khoản
        </button>
      </div>
      <div className="admin-summary">
        <div>
          <Users size={21} />
          <strong>{data?.filter((u) => u.role === "USER").length || 0}</strong>
          <span>khách hàng</span>
        </div>
        <div>
          <ShieldCheck size={21} />
          <strong>7 ngày</strong>
          <span>thời hạn mặc định</span>
        </div>
        <div>
          <KeyRound size={21} />
          <strong>Thiết bị</strong>
          <span>gắn với tài khoản</span>
        </div>
      </div>
      <div className="toolbar">
        <h2>Danh sách tài khoản</h2>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Tìm khách hàng"
            placeholder="Tìm tên hoặc email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <ErrorBox message={loadError} />
      {!data && !loadError ? (
        <Loading />
      ) : (
        <div className="table-panel">
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Trạng thái</th>
                <th>Ngày bắt đầu</th>
                <th>Hết hạn</th>
                <th>Thiết bị</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data
                ?.filter((u) =>
                  `${u.name} ${u.email}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-person">
                        <span className="avatar">{u.name[0]}</span>
                        <div>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge
                        status={
                          u.licenseStatus || (u.enabled ? "ACTIVE" : "DISABLED")
                        }
                      />
                      {u.role === "ADMIN" && (
                        <span className="role-label">ADMIN</span>
                      )}
                    </td>
                    <td>{date(u.activeFrom)}</td>
                    <td>
                      {u.role === "ADMIN"
                        ? "Không giới hạn"
                        : date(u.expiresAt)}
                    </td>
                    <td>
                      <span className="muted">
                        {u.deviceId ? "Đã liên kết" : "Chưa liên kết"}
                      </span>
                    </td>
                    <td>
                      {u.role !== "ADMIN" && (
                        <button
                          className="button compact"
                          onClick={() => {
                            setSelected(u);
                            setError("");
                          }}
                        >
                          Quản lý
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={create}
        onClose={() => setCreate(false)}
        title="Tạo tài khoản khách hàng"
        description="Thông tin đăng nhập này sẽ được bạn cung cấp cho khách hàng."
      >
        <form className="form-stack" onSubmit={createUser}>
          <Field label="Tên khách hàng">
            <input name="name" required />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required />
          </Field>
          <Field label="Mật khẩu" hint="Tối thiểu 12 ký tự.">
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
            />
          </Field>
          <Field label="Thời hạn (ngày)">
            <input
              name="days"
              type="number"
              defaultValue={7}
              min={1}
              max={3650}
              required
            />
          </Field>
          <ErrorBox message={error} />
          <div className="form-footer">
            <button className="button primary" disabled={busy}>
              {busy ? <Spinner /> : <Plus size={16} />} Tạo tài khoản
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!selected}
        onClose={() => setSelected(undefined)}
        title={selected?.name || "Tài khoản"}
        description={selected?.email || "Quản lý tài khoản"}
      >
        {selected && (
          <div className="form-stack">
            <div className="detail-grid">
              <div>
                <small>Thời hạn hiện tại</small>
                <strong>{date(selected.expiresAt)}</strong>
              </div>
              <div>
                <small>Thiết bị</small>
                <strong className="device-id">
                  {selected.deviceId || "Chưa liên kết"}
                </strong>
              </div>
            </div>
            <form
              className="extend-form"
              onSubmit={(e) => {
                e.preventDefault();
                void update({
                  days: Number(new FormData(e.currentTarget).get("days")),
                });
              }}
            >
              <Field label="Gia hạn thêm (ngày)">
                <input
                  name="days"
                  type="number"
                  min={1}
                  max={3650}
                  defaultValue={7}
                  required
                />
              </Field>
              <button className="button primary" disabled={busy}>
                <Clock3 size={16} /> Gia hạn
              </button>
            </form>
            <div className="account-action">
              <div>
                <strong>Thiết bị đăng nhập</strong>
                <p>Cho phép khách hàng đăng nhập lại trên thiết bị mới.</p>
              </div>
              <button
                className="button"
                disabled={busy || !selected.deviceId}
                onClick={() => void update({ resetDevice: true })}
              >
                <RefreshCw size={16} /> Đặt lại
              </button>
            </div>
            <div className="account-action">
              <div>
                <strong>
                  {selected.enabled ? "Khóa tài khoản" : "Mở lại tài khoản"}
                </strong>
                <p>
                  {selected.enabled
                    ? "Dừng quyền truy cập và các phiên đăng nhập."
                    : "Khôi phục truy cập trong thời hạn còn hiệu lực."}
                </p>
              </div>
              <button
                className={"button " + (selected.enabled ? "danger" : "")}
                disabled={busy}
                onClick={() => void update({ enabled: !selected.enabled })}
              >
                {selected.enabled ? (
                  <LockKeyhole size={16} />
                ) : (
                  <UnlockKeyhole size={16} />
                )}{" "}
                {selected.enabled ? "Khóa" : "Mở lại"}
              </button>
            </div>
            <ErrorBox message={error} />
          </div>
        )}
      </Modal>
    </>
  );
}
export function Audit() {
  const { data, error } = useRemote<ActivityType[]>("/admin/audit", 0, 8000);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SYSTEM ACTIVITY</span>
          <h1>Nhật ký hoạt động</h1>
          <p>Theo dõi các thay đổi và tác vụ đã được hệ thống ghi nhận.</p>
        </div>
        <span className="header-icon">
          <Activity size={25} />
        </span>
      </div>
      <ErrorBox message={error} />
      {!data && !error ? (
        <Loading />
      ) : data?.length ? (
        <div className="panel audit-list">
          {data.map((item) => (
            <details className="audit-item" key={item.id}>
              <summary>
                <span className="audit-icon">
                  <Activity size={17} />
                </span>
                <div>
                  <strong>{item.action}</strong>
                  <small>{item.userId || "Hệ thống"}</small>
                </div>
                <time>{new Date(item.createdAt).toLocaleString("vi-VN")}</time>
              </summary>
              <JsonView value={item} />
            </details>
          ))}
        </div>
      ) : (
        <Empty title="Chưa có hoạt động" />
      )}
    </>
  );
}
export function Connections({ admin = false }: { admin?: boolean }) {
  const [revision, setRevision] = useState(0);
  const { data, error } = useRemote<Provider[]>(
    "/provider-connections",
    revision,
  );
  const health = useRemote<{
    database: boolean;
    failedJobs: { id: string; kind: string; error?: { message: string } }[];
  }>(admin ? "/admin/health" : "/health", revision);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONNECTED WORKSPACE</span>
          <h1>{admin ? "Tình trạng hệ thống" : "Kết nối dịch vụ"}</h1>
          <p>Các dịch vụ đang hỗ trợ quy trình sáng tạo của bạn.</p>
        </div>
        <button className="button" onClick={() => setRevision((n) => n + 1)}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>
      <ErrorBox message={error || health.error} />
      {admin && health.data && (
        <div className="health-banner">
          <Server size={22} />
          <div>
            <strong>Cơ sở dữ liệu</strong>
            <p>{health.data.database ? "Đang kết nối" : "Chưa kết nối"}</p>
          </div>
          <Badge status={health.data.database ? "CONNECTED" : "ERROR"} />
        </div>
      )}
      {!data && !error ? (
        <Loading />
      ) : (
        <div className="provider-grid">
          {data?.map((p, i) => (
            <section className="provider-card" key={p.provider}>
              <div className="row">
                <span className={"provider-symbol tone-" + (i % 4)}>
                  <Cable size={24} />
                </span>
                <Badge status={p.status} />
              </div>
              <h3>{p.label}</h3>
              <p>{p.description}</p>
              <div className="provider-footer">
                {p.available ? (
                  <>
                    <Check size={16} /> Sẵn sàng theo cấu hình máy chủ
                  </>
                ) : (
                  <>
                    <Clock3 size={16} /> Chưa có kết nối khả dụng
                  </>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
      {admin && !!health.data?.failedJobs?.length && (
        <section className="panel failed-jobs">
          <h2>Tác vụ cần xử lý</h2>
          {health.data.failedJobs.map((j) => (
            <ErrorBox
              key={j.id}
              message={`${j.kind}: ${j.error?.message || j.id}`}
            />
          ))}
        </section>
      )}
    </>
  );
}
