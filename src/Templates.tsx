import { useState, type FormEvent } from "react";
import {
  Plus,
  ArrowUpRight,
  Blocks,
  Clock3,
  Layers3,
  Check,
  RefreshCw,
  FileText,
  Download,
  Search,
} from "lucide-react";
import { api } from "./api";
import { useRemote } from "./hooks";
import {
  Badge,
  Empty,
  ErrorBox,
  Field,
  JsonView,
  Loading,
  Modal,
  Spinner,
} from "./ui";
import type { Template, TemplateInput } from "./types";
function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function TemplateForm({
  open,
  onClose,
  initial,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Template;
  onDone: (t: Template) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const value = initial?.input;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const input: TemplateInput = {
      name: String(form.get("name")),
      domain: String(form.get("domain")),
      requirements: String(form.get("requirements")),
      style: String(form.get("style")),
      language: String(form.get("language")),
      durationSeconds: Number(form.get("durationSeconds")),
      sceneDurationSeconds: Number(form.get("sceneDurationSeconds")),
      chapterCount: Number(form.get("chapterCount")),
      reference: String(form.get("reference")),
    };
    try {
      onDone(
        await api<Template>(
          initial ? "/templates/" + initial.id : "/templates",
          initial ? "PATCH" : "POST",
          input,
        ),
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Điều chỉnh template" : "Tạo template của bạn"}
      description="Định nghĩa một khuôn mẫu có thể dùng lại cho nhiều dự án."
      wide
    >
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Tên template">
            <input
              name="name"
              defaultValue={value?.name}
              placeholder="Ví dụ: Khoa học dễ hiểu"
              required
              minLength={2}
            />
          </Field>
          <Field label="Chủ đề / lĩnh vực">
            <input
              name="domain"
              defaultValue={value?.domain}
              list="domains"
              placeholder="Nhập chủ đề bất kỳ…"
              required
              minLength={2}
            />
            <datalist id="domains">
              {[
                "Giáo dục & khoa học",
                "Sản phẩm & thương hiệu",
                "Thiên nhiên & khám phá",
                "Phim & kể chuyện",
                "Lịch sử & văn hóa",
                "Sức khỏe & lối sống",
              ].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </datalist>
          </Field>
        </div>
        <Field
          label="Yêu cầu nội dung"
          hint="Mô tả cấu trúc, khán giả và cách kể chuyện chung. Nội dung của từng dự án được nhập sau."
        >
          <textarea
            name="requirements"
            defaultValue={value?.requirements}
            rows={4}
            required
            minLength={5}
            placeholder="Mở bằng một câu hỏi thú vị, giải thích bằng ví dụ gần gũi, kết thúc với một điều đáng nhớ…"
          />
        </Field>
        <div className="form-grid">
          <Field label="Phong cách hình ảnh">
            <input
              name="style"
              defaultValue={value?.style}
              placeholder="Minh họa hiện đại, màu sắc dịu…"
              required
              minLength={2}
            />
          </Field>
          <Field label="Ngôn ngữ">
            <input
              name="language"
              defaultValue={value?.language || "Vietnamese"}
              list="languages"
              required
            />
            <datalist id="languages">
              <option>Vietnamese</option>
              <option>English</option>
              <option>Japanese</option>
            </datalist>
          </Field>
        </div>
        <div className="form-grid three">
          <Field label="Tổng thời lượng (giây)">
            <input
              name="durationSeconds"
              type="number"
              min={2}
              max={7200}
              defaultValue={value?.durationSeconds || 30}
              required
            />
          </Field>
          <Field label="Mỗi cảnh (giây)">
            <input
              name="sceneDurationSeconds"
              type="number"
              min={1}
              max={30}
              defaultValue={value?.sceneDurationSeconds || 5}
              required
            />
          </Field>
          <Field label="Số chương">
            <input
              name="chapterCount"
              type="number"
              min={1}
              max={100}
              defaultValue={value?.chapterCount || 1}
              required
            />
          </Field>
        </div>
        <Field label="Mô tả tham khảo (tùy chọn)">
          <textarea
            name="reference"
            rows={2}
            defaultValue={value?.reference}
            placeholder="Những đặc điểm về cấu trúc hoặc phong cách bạn muốn tham khảo…"
          />
        </Field>
        <ErrorBox message={error} />
        <div className="form-footer">
          <span className="muted small-text">
            Studio sẽ tạo công thức và 5 file cho các bước.
          </span>
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Blocks size={17} />}{" "}
            {busy
              ? "Đang dựng template…"
              : initial
                ? "Tạo phiên bản mới"
                : "Dựng template"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Templates({
  notify,
  admin = false,
  libraryMode = false,
  onProjectCreated,
}: {
  notify: (message: string) => void;
  admin?: boolean;
  /** libraryMode=true: hiển thị Template Library để chọn template tạo dự án */
  libraryMode?: boolean;
  onProjectCreated?: (project: any) => void;
}) {
  const [revision, setRevision] = useState(0),
    [search, setSearch] = useState(""),
    [create, setCreate] = useState(false),
    [editing, setEditing] = useState<Template>(),
    [selected, setSelected] = useState<Template>(),
    [versionNo, setVersionNo] = useState<number>(),
    [tab, setTab] = useState("overview"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const { data, error: loadError } = useRemote<Template[]>(
    admin ? "/admin/templates" : "/templates",
    revision,
  );
  const version =
    selected?.versions.find((v) => v.version === versionNo) ||
    selected?.versions.at(-1);
  function open(template: Template) {
    setSelected(template);
    setVersionNo(template.currentVersion);
    setTab("overview");
    setError("");
  }
  function done(t: Template) {
    setRevision((n) => n + 1);
    open(t);
    notify("Đã tạo phiên bản template.");
  }
  async function command(action: string) {
    if (!selected) return;
    setBusy(action);
    setError("");
    try {
      const next = await api<Template>(
        `/templates/${selected.id}/${action}`,
        "POST",
        {},
      );
      open(next);
      setRevision((n) => n + 1);
      notify(
        action === "publish"
          ? "Đã xuất bản template."
          : "Đã tạo phiên bản mới.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {libraryMode ? "TEMPLATE LIBRARY" : "TEMPLATE STUDIO"}
          </span>
          <h1>
            {admin
              ? "Hỗ trợ template"
              : libraryMode
                ? "Thư viện Template"
                : "Tạo Template mới"}
          </h1>
          <p>
            {admin
              ? "Kiểm tra và sửa phiên bản template của khách hàng."
              : libraryMode
                ? "Chọn template đã xuất bản để tạo dự án mới."
                : "Xây dựng một lần. Sáng tạo nhiều câu chuyện theo phong cách riêng."}
          </p>
        </div>
        {!admin && !libraryMode && (
          <button className="button primary" onClick={() => setCreate(true)}>
            <Plus size={18} /> Tạo template
          </button>
        )}
      </div>
      <div className="template-intro">
        <div className="intro-icon">
          <Blocks size={29} />
        </div>
        <div>
          <h3>Một bộ luật, năm bước sáng tạo</h3>
          <p>
            Mỗi template bao gồm công thức nội dung, cấu hình và 5 file dành
            riêng cho từng bước. Dự án luôn giữ nguyên phiên bản bạn đã chọn.
          </p>
        </div>
        <span className="intro-steps">
          01 <i /> 02 <i /> 03 <i /> 04 <i /> 05
        </span>
      </div>
      <div className="toolbar">
        <span className="muted">
          {data?.length || 0} template trong thư viện
        </span>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Tìm template"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên hoặc chủ đề…"
          />
        </label>
      </div>
      <ErrorBox message={loadError} />
      {!data && !loadError ? (
        <Loading />
      ) : data?.length ? (
        <div className="template-grid">
          {data
            .filter((t) =>
              `${t.name} ${t.input.domain}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((t, i) => (
              <button
                key={t.id}
                className="template-card"
                onClick={() => open(t)}
              >
                <div className="row">
                  <span className={"template-symbol tone-" + (i % 4)}>
                    <Blocks size={24} />
                  </span>
                  <Badge status={t.status} />
                </div>
                <span className="template-domain">{t.input.domain}</span>
                <h3>{t.name}</h3>
                <p>{t.input.requirements}</p>
                <div className="template-meta">
                  <span>
                    <Clock3 size={14} />
                    {t.input.durationSeconds}s
                  </span>
                  <span>
                    <Layers3 size={14} />
                    {t.sceneCount} cảnh
                  </span>
                  <span>v{t.currentVersion}</span>
                </div>
                <div className="template-bottom">
                  <span>Xem template</span>
                  <ArrowUpRight size={18} />
                </div>
              </button>
            ))}
        </div>
      ) : (
        <Empty title="Thư viện đang chờ ý tưởng đầu tiên">
          Tạo template với chủ đề và phong cách mà bạn muốn.
        </Empty>
      )}
      <TemplateForm
        key={create ? "new-open" : "new-closed"}
        open={create}
        onClose={() => setCreate(false)}
        onDone={done}
      />
      {editing && (
        <TemplateForm
          open
          initial={editing}
          onClose={() => setEditing(undefined)}
          onDone={done}
        />
      )}
      <Modal
        open={!!selected && !editing}
        onClose={() => setSelected(undefined)}
        title={selected?.name || "Template"}
        description="Kiểm tra, xuất bản và quản lý các phiên bản template."
        wide
      >
        {selected && version && (
          <>
            <div className="template-detail-top">
              <Badge status={version.published ? "READY" : "DRAFT"} />
              <select
                aria-label="Phiên bản template"
                value={version.version}
                onChange={(e) => setVersionNo(Number(e.target.value))}
              >
                {selected.versions.map((v) => (
                  <option value={v.version} key={v.version}>
                    Phiên bản {v.version}
                    {v.published ? " · Đã xuất bản" : ""}
                  </option>
                ))}
              </select>
              <button
                className="button compact"
                disabled={!!busy}
                onClick={() => {
                  setEditing(selected);
                }}
              >
                Điều chỉnh
              </button>
            </div>
            <div className="tabs scroll-tabs">
              {[
                ["overview", "Tổng quan"],
                ["formula", "Công thức"],
                ["variables", "Cấu hình"],
                ...version.children.map((c) => [
                  "step" + c.step,
                  "Step " + c.step,
                ]),
              ].map(([v, label]) => (
                <button
                  className={tab === v ? "active" : ""}
                  key={v}
                  onClick={() => setTab(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="template-detail-body">
              {tab === "overview" ? (
                <>
                  <div className="validation-banner">
                    <Check size={20} />
                    <div>
                      <strong>
                        {version.validation.valid
                          ? "Template đã vượt qua kiểm tra"
                          : "Template cần điều chỉnh"}
                      </strong>
                      <p>
                        {version.children.length} file con ·{" "}
                        {version.variables.length} biến cấu hình
                      </p>
                    </div>
                  </div>
                  <h3>{selected.input.domain}</h3>
                  <p>{selected.input.requirements}</p>
                  <div className="detail-grid">
                    <div>
                      <small>Phong cách</small>
                      <strong>{selected.input.style}</strong>
                    </div>
                    <div>
                      <small>Ngôn ngữ</small>
                      <strong>{selected.input.language}</strong>
                    </div>
                  </div>
                  {version.validation.errors.map((e) => (
                    <ErrorBox key={e.key} message={e.code + ": " + e.key} />
                  ))}
                </>
              ) : tab === "formula" ? (
                <div className="formula-content">
                  {Object.entries(version.formula).map(([key, value]) => (
                    <div key={key}>
                      <h4>{key}</h4>
                      {Array.isArray(value) ? (
                        <ul>
                          {value.map((v, i) => (
                            <li key={i}>{String(v)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{String(value)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : tab === "variables" ? (
                <JsonView value={version.config} />
              ) : (
                version.children
                  .filter((c) => "step" + c.step === tab)
                  .map((c) => (
                    <div key={c.step}>
                      <div className="child-file-heading">
                        <span>
                          <FileText size={16} />
                          {c.name}
                        </span>
                        <button
                          className="button compact"
                          onClick={() => downloadText(c.name, c.content)}
                        >
                          <Download size={15} /> Tải file
                        </button>
                      </div>
                      <pre className="code-view child-preview">{c.content}</pre>
                    </div>
                  ))
              )}
            </div>
            <ErrorBox message={error} />
            <div className="form-footer">
              <button
                className="button"
                disabled={!!busy}
                onClick={() => void command("build")}
              >
                {busy === "build" ? <Spinner /> : <RefreshCw size={16} />} Dựng
                lại
              </button>
              {!version.published &&
                version.version === selected.currentVersion && (
                  <button
                    className="button primary"
                    disabled={!!busy || !version.validation.valid}
                    onClick={() => void command("publish")}
                  >
                    {busy === "publish" ? <Spinner /> : <Check size={17} />}{" "}
                    Xuất bản template
                  </button>
                )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
