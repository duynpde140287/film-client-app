import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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
  Play,
  ChevronDown,
  Link as LinkIcon,
  Image as ImageIcon,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { api, upload } from "./api";
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
import type { Template } from "./types";
import { NewProject } from "./Overview";
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
const DOMAIN_OPTIONS = [
  "Giáo dục & khoa học",
  "Sản phẩm & thương hiệu",
  "Thiên nhiên & khám phá",
  "Phim & kể chuyện",
  "Lịch sử & văn hóa",
  "Sức khỏe & lối sống",
];

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
    [submitting, setSubmitting] = useState(false),
    [error, setError] = useState(""),
    [domainOpen, setDomainOpen] = useState(false);
  const value = initial?.input;
  const [name, setName] = useState(value?.name || "");
  const [domain, setDomain] = useState(value?.domain || "");
  const [hasStyleFiles, setHasStyleFiles] = useState(false);
  const domainRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [build, setBuild] = useState<{ id: string; content?: { title: string; durationSeconds: number }; formula?: { name: string; coreTheme: string } } | null>(null);
  const [runningStage, setRunningStage] = useState<0 | 1 | 2>(0);

  const { data: aiSessions } = useRemote<Array<{ provider: string; connected: boolean }>>("/ai-sessions");
  const isGeminiConnected = Boolean(aiSessions?.find(s => s.provider === "gemini")?.connected);

  const canStep1 = isGeminiConnected && name.trim().length >= 2 && domain.trim().length >= 2;
  const canStep2 = canStep1 && Boolean(build?.content);
  const canStep3 = canStep2 && Boolean(build?.formula);

  const { data: policy } = useRemote<{accept:string; textAccept?: string; imageAccept?: string; hint:string; maxImageBytes?: number; maxStyleImages?: number}>("/template-import-policy");
  const maxImageMb = Math.floor((policy?.maxImageBytes || 10 * 1024 * 1024) / 1024 / 1024);
  const maxStyleImages = policy?.maxStyleImages || 6;
  const keepStyleImages = false;

  const canSubmit = isGeminiConnected && canStep3 && (hasStyleFiles || keepStyleImages) && !busy && !submitting && runningStage === 0;

  async function generateStage(stage: 1 | 2) {
    const form = formRef.current;
    if (!form || busy || submitting || runningStage > 0) return;
    if (!isGeminiConnected) {
      setError("Vui lòng vào Cài đặt → Liên kết AI để đăng nhập Gemini trước khi dựng.");
      return;
    }
    if (stage === 1 && !canStep1) {
      setError("Vui lòng nhập Tên template và Lĩnh vực trước.");
      return;
    }
    const field = form.elements.namedItem(stage === 1 ? "sourceVideoUrl" : "customerIdea") as HTMLInputElement;
    if (!field.reportValidity()) return;
    if (stage === 2 && !build?.content) {
      setError("Chạy bước 1 trước.");
      return;
    }
    setBusy(true);
    setRunningStage(stage);
    setError("");
    try {
      if (stage === 1) {
        setBuild(await api("/template-builds/content", "POST", { sourceVideoUrl: field.value }));
      } else {
        const result = await api<{ formula: { name: string; coreTheme: string } }>(
          "/template-builds/" + build!.id + "/formula",
          "POST",
          { customerIdea: field.value },
        );
        setBuild(previous => (previous ? { ...previous, formula: result.formula } : previous));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setRunningStage(0);
    }
  }

  useEffect(() => {
    function close(e: MouseEvent) {
      if (domainRef.current && !domainRef.current.contains(e.target as Node)) setDomainOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    if (!build?.formula) {
      setError("Hoàn tất bước 1 và 2 trước.");
      return;
    }
    if (!hasStyleFiles && !keepStyleImages) {
      setError("Vui lòng chọn ít nhất 1 ảnh phong cách ở bước 3.");
      return;
    }
    const form = new FormData(e.currentTarget);
    form.set("buildId", build.id);
    setBusy(true);
    setSubmitting(true);
    setError("");
    if (initial) form.set("expectedVersion", String(initial.currentVersion));
    for (const key of ["contentFile", "styleFile", "styleImages"]) {
      const files = form.getAll(key);
      if (files.length && files.every((file) => file instanceof File && !file.name)) form.delete(key);
    }
    try {
      onDone(
        await upload<Template>(
          initial ? "/templates/" + initial.id + "/import" : "/templates/import",
          initial ? "PATCH" : "POST",
          form,
        ),
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Cập nhật template" : "Thêm template"}
      wide
    >
      <form ref={formRef} className="form-stack template-build-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Tên template">
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Wildlife World"
              disabled={busy || submitting || runningStage > 0}
              required
              minLength={2}
            />
          </Field>
          <Field label="Chủ đề / lĩnh vực">
            <div className="combo-field" ref={domainRef}>
              <input
                name="domain"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setDomainOpen(true);
                }}
                onFocus={() => setDomainOpen(true)}
                placeholder="Nhập hoặc chọn chủ đề"
                disabled={busy || submitting || runningStage > 0}
                required
                minLength={2}
                maxLength={120}
                autoComplete="off"
              />
              <button
                type="button"
                className="combo-toggle"
                aria-label="Mở danh sách chủ đề"
                disabled={busy || submitting || runningStage > 0}
                onClick={() => setDomainOpen((v) => !v)}
              >
                <ChevronDown size={16} />
              </button>
              {domainOpen && (
                <div className="combo-menu" role="listbox">
                  {DOMAIN_OPTIONS.filter((item) =>
                    item.toLowerCase().includes(domain.trim().toLowerCase()),
                  ).map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      className="combo-option"
                      onClick={() => {
                        setDomain(item);
                        setDomainOpen(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>

        {aiSessions && !isGeminiConnected && (
          <div style={{ margin: "0 0 1.25rem 0", padding: "0.85rem 1.15rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#fca5a5", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <strong style={{ color: "#f87171" }}>Chưa kết nối Gemini:</strong> Để dựng template (lấy nội dung video & công thức), bạn cần đăng nhập tài khoản Gemini.
            </div>
            <Link to="/settings" style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", background: "#ef4444", color: "#fff", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, whiteSpace: "nowrap" }}>
              Liên kết AI ngay
            </Link>
          </div>
        )}

        <div className="template-builder-flow">
          {/* BƯỚC 1: Video nguồn */}
          <section className={"template-build-step " + (!canStep1 ? "is-step-disabled" : "")}>
            <div className="build-step-top">
              <span className="build-step-no">1</span>
              <h3 className="build-step-title">
                Video nguồn {!isGeminiConnected ? <small className="muted font-normal text-danger" style={{ color: "#f87171" }}>(Cần đăng nhập Gemini)</small> : !canStep1 && <small className="muted font-normal">(Cần nhập Tên & Lĩnh vực)</small>}
              </h3>
            </div>
            <div className="build-step-controls">
              <div className="build-step-input-col">
                <label className="link-input-shell">
                  <LinkIcon size={17} />
                  <input
                    name="sourceVideoUrl"
                    onChange={() => setBuild(null)}
                    disabled={!canStep1 || busy || submitting || runningStage > 0}
                    type="url"
                    defaultValue={value?.sourceVideoUrl}
                    placeholder={canStep1 ? "https://www.youtube.com/watch?v=..." : "Nhập Tên template và Lĩnh vực trước để mở..."}
                    required
                    maxLength={2048}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              </div>
              <button
                className="button gradient-action build-step-btn"
                type="button"
                disabled={!canStep1 || busy || submitting || runningStage > 0}
                onClick={() => void generateStage(1)}
              >
                {runningStage === 1 ? <Spinner /> : <Sparkles size={16} />}
                {runningStage === 1 ? "Đang lấy nội dung…" : "Lấy nội dung"}
              </button>
              <aside className={"build-step-result " + (build?.content ? "is-ready" : "")}>
                <strong>{build?.content?.title || "Nội dung nguồn"}</strong>
                <span>
                  {runningStage === 1
                    ? "Đang xử lý…"
                    : build?.content
                      ? "Hoàn tất"
                      : canStep1
                        ? "Chờ chạy"
                        : "Chưa mở"}
                </span>
                <small>{build?.content ? "Đã trích xuất" : canStep1 ? "Chưa có kết quả" : "Cần Tên & Lĩnh vực"}</small>
              </aside>
            </div>
          </section>

          {/* BƯỚC 2: Ý tưởng */}
          <section className={"template-build-step " + (!canStep2 ? "is-step-disabled" : "")}>
            <div className="build-step-top">
              <span className="build-step-no">2</span>
              <h3 className="build-step-title">
                Ý tưởng {!canStep2 && <small className="muted font-normal">(Cần hoàn thành Bước 1)</small>}
              </h3>
            </div>
            <div className="build-step-controls">
              <div className="build-step-input-col">
                <textarea
                  name="customerIdea"
                  onChange={() => setBuild(previous => (previous ? { ...previous, formula: undefined } : null))}
                  disabled={!canStep2 || busy || submitting || runningStage > 0}
                  rows={3}
                  defaultValue={value?.customerIdea}
                  placeholder={canStep2 ? "Nhập idea, góc kể, đối tượng xem..." : "Hoàn thành bước 1 (Lấy nội dung) để mở..."}
                  required
                  minLength={10}
                  maxLength={4000}
                />
              </div>
              <button
                className="button gradient-action build-step-btn"
                type="button"
                disabled={!canStep2 || busy || submitting || runningStage > 0}
                onClick={() => void generateStage(2)}
              >
                {runningStage === 2 ? <Spinner /> : <Sparkles size={16} />}
                {runningStage === 2 ? "Đang tạo công thức…" : "Tạo công thức"}
              </button>
              <aside className={"build-step-result " + (build?.formula ? "is-ready" : "")}>
                <strong>{build?.formula?.name || "Công thức"}</strong>
                <span>
                  {runningStage === 2
                    ? "Đang xử lý…"
                    : build?.formula
                      ? "Hoàn tất"
                      : canStep2
                        ? "Chờ chạy"
                        : "Chưa mở"}
                </span>
                <small>{build?.formula ? "Đã tạo công thức" : canStep2 ? "Content + idea tạo công thức" : "Cần bước 1"}</small>
              </aside>
            </div>
          </section>

          {/* BƯỚC 3: Ảnh phong cách */}
          <section className={"template-build-step " + (!canStep3 ? "is-step-disabled" : "")}>
            <div className="build-step-top">
              <span className="build-step-no">3</span>
              <h3 className="build-step-title">
                Ảnh phong cách {!canStep3 && <small className="muted font-normal">(Cần hoàn thành Bước 2)</small>}
              </h3>
            </div>
            <div className="build-step-controls">
              <div className="build-step-input-col">
                <label className={"style-dropzone " + (!canStep3 ? "opacity-50 pointer-events-none" : "")}>
                  <ImageIcon size={24} />
                  <span>Kéo thả hoặc chọn ảnh</span>
                  <small>JPG, PNG, WEBP · {maxImageMb}MB/ảnh · tối đa {maxStyleImages}</small>
                  <input
                    type="file"
                    name="styleImages"
                    accept={policy?.imageAccept || ".jpg,.jpeg,.png,.webp"}
                    multiple
                    disabled={!canStep3 || busy || submitting || runningStage > 0}
                    required={!keepStyleImages}
                    onChange={(e) => setHasStyleFiles(Boolean(e.target.files && e.target.files.length > 0))}
                  />
                </label>
                {keepStyleImages && <small className="muted">Đang giữ {value?.sourceFiles?.styleImages?.length} ảnh style.</small>}
              </div>
              <button
                className="button gradient-action build-step-btn"
                type="submit"
                disabled={!canStep3 || (!hasStyleFiles && !keepStyleImages) || busy || submitting || runningStage > 0}
              >
                {submitting ? <Spinner /> : <Sparkles size={16} />}
                {submitting ? "Đang tạo 5 file…" : "Tạo 5 file"}
              </button>
              <aside className={"build-step-result " + (hasStyleFiles ? "is-ready" : "")}>
                <strong>5 file con</strong>
                <span>
                  {submitting
                    ? "Đang tạo…"
                    : hasStyleFiles
                      ? "Sẵn sàng"
                      : canStep3
                        ? "Chờ chọn ảnh"
                        : "Chưa mở"}
                </span>
                <small>Story · Character · Outline · Voice · Image</small>
              </aside>
            </div>
          </section>
        </div>

        <div className="form-grid">
          <Field label="Ngôn ngữ">
            <select
              name="language"
              className="styled-select"
              defaultValue={value?.language || "Vietnamese"}
              disabled={!canStep1 || busy || submitting || runningStage > 0}
              required
            >
              <option value="Vietnamese">🇻🇳 Tiếng Việt (Vietnamese)</option>
              <option value="English">🇺🇸 Tiếng Anh (English)</option>
              <option value="Japanese">🇯🇵 Tiếng Nhật (Japanese)</option>
              <option value="Korean">🇰🇷 Tiếng Hàn (Korean)</option>
              <option value="Chinese">🇨🇳 Tiếng Trung (Chinese)</option>
              <option value="French">🇫🇷 Tiếng Pháp (French)</option>
              <option value="German">🇩🇪 Tiếng Đức (German)</option>
              <option value="Spanish">🇪🇸 Tiếng Tây Ban Nha (Spanish)</option>
            </select>
          </Field>
          <Field label="Tổng thời lượng (giây)">
            <div className="duration-input-wrapper">
              <input
                name="durationSeconds"
                type="number"
                min={2}
                max={7200}
                defaultValue={value?.durationSeconds || 30}
                disabled={!canStep1 || busy || submitting || runningStage > 0}
                required
              />
              <span className="duration-unit-badge">giây</span>
            </div>
          </Field>
        </div>

        <details className="template-options">
          <summary>Ghi chú thêm</summary>
          <Field label="Tham khảo">
            <textarea
              name="reference"
              rows={2}
              defaultValue={value?.reference}
              disabled={!canStep1 || busy || submitting || runningStage > 0}
              placeholder="Những đặc điểm về cấu trúc hoặc phong cách bạn muốn tham khảo…"
            />
          </Field>
        </details>

        <ErrorBox message={error} />

        <div className="form-footer">
          <span className="muted small-text">
            Gemini xử lý bằng tài khoản hệ thống.
          </span>
          <button
            className="button primary"
            type="submit"
            disabled={!canSubmit}
          >
            {submitting ? <Spinner /> : <Blocks size={17} />}{" "}
            {submitting
              ? "Đang dựng…"
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

  libraryMode = false,
  onProjectCreated,
}: {
  notify: (message: string) => void;

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
  const [projectSeed, setProjectSeed] = useState<Template>();
  const { data, error: loadError } = useRemote<Template[]>(
    "/templates",
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
          <span className="eyebrow">TEMPLATES</span>
          <h1>Template cá nhân</h1>
        </div>
        {!libraryMode && (
          <button className="button primary" onClick={() => setCreate(true)}>
            <Plus size={18} /> Thêm template
          </button>
        )}
      </div>
      <div className="template-intro">
        <div className="intro-icon">
          <Blocks size={29} />
        </div>
        <div>
          <h3>5 step cố định</h3>
          <p>Mỗi template sinh 5 file con từ 5 file cha. Dự án dùng đúng phiên bản đã chọn.</p>
        </div>
        <span className="intro-steps">
          01 <i /> 02 <i /> 03 <i /> 04 <i /> 05
        </span>
      </div>
      <div className="toolbar">
        <span className="muted">
          {data?.length || 0} template
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
        <Empty title="Chưa có template">
          Bấm “Thêm template” để bắt đầu.
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
      <NewProject
        open={!!projectSeed}
        onClose={() => setProjectSeed(undefined)}
        templates={projectSeed ? [projectSeed] : []}
        defaultTemplateId={projectSeed?.id}
        onCreated={onProjectCreated}
      />
      <Modal
        open={!!selected && !editing}
        onClose={() => setSelected(undefined)}
        title={selected?.name || "Template"}
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
                          ? "Template hợp lệ · 5 file con đã được tạo từ 5 file cha"
                          : "Template cần điều chỉnh"}
                      </strong>
                      <p>
                        Dữ liệu cấu hình đã đưa vào 5 Parent Master để tạo ra {version.children.length} file con (Step 1 - 5). Mỗi file con định nghĩa luật tạo script cho từng bước tương ứng.
                      </p>
                    </div>
                  </div>
                  <h3>{(version.input || selected.input).domain}</h3>
                  {(version.input || selected.input).sourceFiles && <div className="imported-file-summary">
                    <h4>File đã import</h4>
                    {(["content", "style"] as const).map(kind => {
                      const input = version.input || selected.input;
                      const file = input.sourceFiles?.[kind];
                      return file && <div key={kind} className="row">
                        <FileText size={16}/><span>{file.filename} · {file.characters.toLocaleString("vi-VN")} ký tự</span>
                        <button className="button compact" onClick={() => downloadText(file.filename, kind === "content" ? input.requirements : input.style)}>Tải nội dung đã đọc</button>
                      </div>;
                    })}
                  </div>}
                  <details className="import-preview"><summary>Nội dung khách hàng</summary><pre>{(version.input || selected.input).requirements}</pre></details>
                  <div className="detail-grid">
                    <div>
                      <small>Phong cách</small>
                      <details className="import-preview"><summary>Xem style</summary><pre>{(version.input || selected.input).style}</pre></details>
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
                {busy === "build" ? <Spinner /> : <RefreshCw size={16} />} Dựng lại
              </button>
              <div className="button-group">
                {!version.published &&
                  version.version === selected.currentVersion && (
                    <button
                      className="button"
                      disabled={!!busy || !version.validation.valid}
                      onClick={() => void command("publish")}
                    >
                      {busy === "publish" ? <Spinner /> : <Check size={17} />} Xuất bản
                    </button>
                  )}
                {version.published && (
                  <button
                    className="button primary"
                    disabled={!!busy}
                    onClick={() => {
                      setProjectSeed(selected);
                      setSelected(undefined);
                    }}
                  >
                    <Play size={16} /> Tạo dự án
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
