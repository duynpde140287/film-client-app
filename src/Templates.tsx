import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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
import { api, upload, getSession } from "./api";
import { useRemote } from "./hooks";
import { useAiLogin } from './hooks/useAiLogin';
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

function normalizeDisplayedText(value: string): string {
  return value
    .replace(/\\r\\n/g, "\r\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r");
}

function formulaDisplayText(formula: string | Record<string, any>): string {
  const raw = typeof formula === "string" ? formula : JSON.stringify(formula, null, 2);
  return normalizeDisplayedText(raw);
}

function ResultRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return <div className="build-result-row"><span className="build-result-row-icon">{icon}</span><span className="build-result-row-label">{label}</span><strong>{value}</strong></div>;
}

function ResultStatus({ ready, busy, readyLabel = "Hoàn tất" }: { ready: boolean; busy: boolean; readyLabel?: string }) {
  return <span className={"build-result-status " + (ready ? "is-ready" : busy ? "is-busy" : "")}>{ready ? <Check size={12} strokeWidth={3} /> : null}{busy ? "Đang xử lý…" : ready ? readyLabel : "Chưa có kết quả"}</span>;
}

type PreparedTemplate = {
  payload: string;
  signature: string;
  children: { step: number; name: string; content: string }[];
};
type TemplateJob = { id: string; stage: 1 | 2 | 3; createdAt: number; status: string; result?: any; error?: { message: string } };
type TemplateDraft = {
  name?: string;
  sourceVideoUrl?: string;
  customerIdea?: string;
  country?: string;
  durationSeconds?: string;
  build?: { content?: Record<string, any>; formula?: string | Record<string, any> } | null;
  prepared?: PreparedTemplate | null;
  pending?: TemplateJob | null;
  styleImages?: { name: string; type: string; dataUrl: string }[];
};

function templateDraftKey() { return 'template_build_draft:' + (getSession()?.user?.id || 'anonymous'); }
function readTemplateDraft(): TemplateDraft {
  try { return JSON.parse(localStorage.getItem(templateDraftKey()) || "{}") || {}; }
  catch { return {}; }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Không đọc được file ảnh."));
    reader.readAsDataURL(file);
  });
}


const BuildStep = ({
  stepNo,
  title,
  provider,
  providerLabel,
  isConnected,
  onLogin,
  busy,
  children
}: {
  stepNo: number;
  title: string;
  provider?: string;
  providerLabel?: string;
  isConnected?: boolean;
  onLogin: (provider: string) => void;
  busy: boolean | string;
  children: React.ReactNode;
}) => (
  <section className="template-build-step">
    <div className="build-step-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span className="build-step-no">{stepNo}</span>
        <h3 className="build-step-title" style={{ margin: 0 }}>{title}</h3>
      </div>
      {provider && !isConnected && (
        <button
          type="button"
          onClick={() => onLogin(provider)}
          disabled={Boolean(busy)}
          style={{
            padding: "0.25rem 0.6rem",
            borderRadius: "6px",
            background: "#ef4444",
            color: "#fff",
            textDecoration: "none",
            fontSize: "0.78rem",
            fontWeight: 600,
            whiteSpace: "normal",
            border: "none",
            cursor: Boolean(busy) ? "not-allowed" : "pointer",
          }}
        >
          {`Liên kết ${providerLabel}`}
        </button>
      )}
    </div>
    <div className="build-step-controls">
      {children}
    </div>
  </section>
);

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
    [error, setError] = useState("");
  const value = initial?.input;
  const aiLogin = useAiLogin();
  const savedDraft = readTemplateDraft();
  const [name, setName] = useState(value?.name || savedDraft.name || "");
  const [styleImages, setStyleImages] = useState<NonNullable<TemplateDraft['styleImages']>>(savedDraft.styleImages || []);
  const hasStyleFiles = styleImages.length > 0;

  const formRef = useRef<HTMLFormElement>(null);
  const [prepared, setPrepared] = useState<PreparedTemplate | null>(initial ? null : savedDraft.prepared || null);
  const [pending, setPending] = useState<TemplateJob | null>(initial ? null : savedDraft.pending || null);
  const [build, setBuild] = useState<TemplateDraft["build"]>(() => {
    if (initial) return null; // Không dùng nháp cho mode update
    try {
      const saved = localStorage.getItem(templateDraftKey());
      if (saved) return JSON.parse(saved).build || null;
    } catch { }
    return null;
  });

  useEffect(() => {
    if (!initial && open) {
      const current = readTemplateDraft();
      try {
        localStorage.setItem(templateDraftKey(), JSON.stringify({ ...current, name, build, prepared, pending }));
      } catch { setError("Không đủ dung lượng lưu bản nháp. Hãy chọn ảnh nhỏ hơn."); }
    }
  }, [build, name, initial, prepared, pending, open]);
  useEffect(() => {
    if (initial) return;
    const clearDraftOnExit = () => localStorage.removeItem(templateDraftKey());
    window.addEventListener('beforeunload', clearDraftOnExit);
    return () => window.removeEventListener('beforeunload', clearDraftOnExit);
  }, [initial]);
  const [runningStage, setRunningStage] = useState<0 | 1 | 2 | 3>(0);
  const [aiRevision, setAiRevision] = useState(0);
  useEffect(() => {
    if (!pending) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setBusy(true);
    setRunningStage(pending.stage);
    const finish = () => { setPending(null); setBusy(false); setRunningStage(0); };
    const unwrapJobResult = (result: any) => result?.data ?? result?.result ?? result;
    const poll = async () => {
      try {
        const job = await api<TemplateJob>('/template-builds/jobs/' + pending.id);
        if (!active) return;
        if (job.status === 'DONE') {
          const result = unwrapJobResult(job.result);
          if (pending.stage === 1) {
            if (!result?.content) {
              setError('Step 1 hoàn tất nhưng không nhận được dữ liệu nội dung. Hãy thử lại.');
            } else setBuild(result);
          } else if (pending.stage === 2) {
            if (!result?.formula) {
              setError('Step 2 hoàn tất nhưng không nhận được công thức. Hãy thử lại.');
            } else setBuild(previous => ({ ...previous, formula: result.formula }));
          } else if (result?.children?.length) setPrepared(result);
          else setError('Step 3 hoàn tất nhưng không nhận đủ 5 file con. Hãy thử lại.');
          finish();
          return;
        }
        if (job.status === 'ERROR') { setError(job.error?.message || 'Không hoàn tất được bước template.'); finish(); setAiRevision(value => value + 1); return; }
        if (Date.now() - pending.createdAt > 480000) { setError('Tác vụ quá thời gian chờ. Dữ liệu nháp đã có vẫn được giữ nguyên.'); finish(); return; }
      } catch (e) {
        if (!active) return;
        const err = e as import('./services/api.service').ApiError;
        if (err.code !== 'NETWORK_ERROR' || Date.now() - pending.createdAt > 480000) { setError(err.message); finish(); return; }
      }
      timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [pending?.id]);
  useEffect(() => {
    const refresh = () => setAiRevision(value => value + 1);
    window.addEventListener('ai-status-change', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('ai-status-change', refresh); window.removeEventListener('focus', refresh); };
  }, []);

  const { data: aiSessions } = useRemote<Array<{ provider: string; connected: boolean; browser?: 'Chrome' | 'Edge' | null }>>("/ai-sessions", aiRevision);
  // Step 1 uses NotebookLM under the shared Google session; Gemini chat is not called here.
  const isGoogleConnected = Boolean(aiSessions?.find(s => s.provider === "gemini" || s.provider === "notebooklm")?.connected);
  const isGptConnected = Boolean(aiSessions?.find(s => s.provider === "chatgpt")?.connected);

  const canStep1 = isGoogleConnected && name.trim().length >= 2;
  const canStep2 = isGptConnected && name.trim().length >= 2 && Boolean(build?.content);
  const canStep3 = canStep2 && Boolean(build?.formula);

  const { data: policy } = useRemote<{ accept: string; textAccept?: string; imageAccept?: string; hint: string; maxImageBytes?: number; maxStyleImages?: number }>("/template-import-policy");
  const maxImageMb = Math.floor((policy?.maxImageBytes || 10 * 1024 * 1024) / 1024 / 1024);
  const maxStyleImages = policy?.maxStyleImages || 6;
  const keepStyleImages = false;

  function saveFormDraft(form: HTMLFormElement | null, patch: Partial<TemplateDraft> = {}) {
    setPrepared(null);
    if (initial || !form) return;
    const current = readTemplateDraft();
    const formData = new FormData(form);
    try {
      localStorage.setItem(templateDraftKey(), JSON.stringify({
        ...current,
        name,
        sourceVideoUrl: String(formData.get("sourceVideoUrl") || ""),
        customerIdea: String(formData.get("customerIdea") || ""),
        country: String(formData.get("country") || ""),
        durationSeconds: String(formData.get("durationSeconds") || "300"),
        prepared: null,
        ...patch,
      }));
    } catch { setError('Không đủ dung lượng lưu bản nháp. Hãy chọn ảnh nhỏ hơn.'); }
  }

  const canSubmit = Boolean(prepared) && !busy && !submitting;

  async function generateStage(stage: 1 | 2) {
    const form = formRef.current;
    if (!form || busy || submitting || runningStage > 0) return;
    const requiredAiConnected = stage === 1 ? isGoogleConnected : isGptConnected;
    const requiredAi = stage === 1 ? "Google / NotebookLM" : "ChatGPT";
    if (!requiredAiConnected) {
      setError(`Vui lòng vào Cài đặt → Tài khoản AI để đăng nhập ${requiredAi} trước khi dựng.`);
      return;
    }
    if (stage === 1 && !canStep1) {
      setError("Vui lòng nhập Tên template trước.");
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
    setPrepared(null);
    setError("");
    try {
      if (stage === 1) {
        setBuild(null);
        setPending(await api<TemplateJob>("/template-builds/jobs/content", "POST", { sourceVideoUrl: field.value }));
      } else {
        const countryField = form.elements.namedItem("country") as HTMLSelectElement | null;
        const job = await api<TemplateJob>(
          "/template-builds/jobs/formula",
          "POST",
          { customerIdea: field.value, country: countryField?.value, step1Text: JSON.stringify(build!.content) },
        );
        setBuild(previous => previous ? { ...previous, formula: undefined } : previous);
        setPending(job);
      }
    } catch (e) {
      const err = e as import("./services/api.service").ApiError;
      setError(err.message || String(e));
      if (err.code === "PROVIDER_LOGIN_REQUIRED") {
        setAiRevision(r => r + 1); // Cập nhật lại giao diện để hiển thị nút Đăng nhập
      }
      setBusy(false);
      setRunningStage(0);
    }
  }



  async function generateChildren() {
    const form = formRef.current;
    if (!form || !canStep3 || busy || !form.reportValidity()) return;
    setBusy(true);
    setRunningStage(3);
    setError("");
    try {
      const uploadData = new FormData(form);
      uploadData.delete("durationMinutes");
      const detectedLanguage = String(build?.content?.sourceLanguage || "").trim();
      const countryLanguage = String(uploadData.get("country") || "Việt Nam").trim();
      uploadData.set("language", detectedLanguage && detectedLanguage.toLowerCase() !== "undetected"
        ? detectedLanguage : countryLanguage);
      uploadData.set("sourceContent", JSON.stringify(build!.content));
      uploadData.set("formulaOutputJson", JSON.stringify(build!.formula));
      const images = uploadData.getAll("styleImages").filter(file => file instanceof File && file.name && file.size);
      if (!images.length) {
        uploadData.delete("styleImages");
        for (const image of readTemplateDraft().styleImages || []) {
          const blob = await (await fetch(image.dataUrl)).blob();
          uploadData.append("styleImages", new File([blob], image.name, { type: image.type || blob.type }));
        }
      }
      setPrepared(null);
      setPending(await upload<TemplateJob>("/template-builds/jobs/children", "POST", uploadData));
    } catch (e) {
      setError((e as Error).message);
      setAiRevision(value => value + 1);
      setBusy(false); setRunningStage(0);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prepared || busy || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const template = await api<Template>("/template-builds/commit", "POST", {
        payload: prepared.payload, signature: prepared.signature,
        ...(initial ? { templateId: initial.id, expectedVersion: initial.currentVersion } : {}),
      });
      if (!initial) localStorage.removeItem(templateDraftKey());
      onDone(template);
      onClose();
    } catch (e) { setError((e as Error).message); }
    finally { setSubmitting(false); }
  }

  const handleClose = () => {
    if (!initial) {
      localStorage.removeItem(templateDraftKey());
      setName("");
      setStyleImages([]);
      setBuild(null);
      setPrepared(null);
      setPending(null);
      setBusy(false);
      setRunningStage(0);
      setError("");
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={initial ? "Cập nhật template" : "Thêm template"}
      wide
    >
      <form ref={formRef} className="form-stack template-build-form" onSubmit={submit}>
        <Field label="Tên template">
          <input
            name="name"
            disabled={busy || submitting}
            value={name}
            onChange={(e) => {
              const nextName = e.target.value;
              setName(nextName);
              saveFormDraft(formRef.current, { name: nextName });
            }}
            placeholder="Ví dụ: Wildlife World"
            required
            minLength={2}
          />
        </Field>
        <input type="hidden" name="domain" value="General" />

        <div className="template-builder-flow">
          {/* BƯỚC 1: Video nguồn */}
          <BuildStep stepNo={1} title="Video nguồn" provider="gemini" providerLabel="Google / NotebookLM" isConnected={isGoogleConnected} busy={busy || aiLogin.busy} onLogin={aiLogin.login}>
            <div className="build-step-input-col">
              <div className="link-input-shell">
                <LinkIcon size={20} strokeWidth={2} />
                <input
                  name="sourceVideoUrl"
                  onChange={() => { setBuild(null); saveFormDraft(formRef.current); }}
                  disabled={submitting || busy}
                  type="url"
                  defaultValue={value?.sourceVideoUrl || savedDraft.sourceVideoUrl}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                  maxLength={2048}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
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
            <aside className={"build-step-result " + (build?.content ? "is-ready has-preview" : "")}>
              <div className="build-result-heading"><div><strong><Check size={15} /> Nội dung</strong><small>{build?.content ? "Đã trích xuất từ video" : "Kết quả Step 1"}</small></div><ResultStatus ready={Boolean(build?.content)} busy={runningStage === 1} /></div>
              {build?.content && <div className="build-result-details">
                <ResultRow icon={<FileText size={13} />} label="Nguồn" value="NotebookLM" />
                <ResultRow icon={<Layers3 size={13} />} label="Nội dung" value={`${String(build.content.content || "").length.toLocaleString()} ký tự`} />
                <ResultRow icon={<Lightbulb size={13} />} label="Ngôn ngữ" value={build.content.sourceLanguage || "Tự nhận diện"} />
              </div>}
              {build?.content && (
                <div className="build-step-result-tooltip">
                  <pre>{JSON.stringify(build.content, null, 2)}</pre>
                </div>
              )}
            </aside>
          </BuildStep>

          {/* BƯỚC 2: Ý tưởng */}
          <BuildStep stepNo={2} title="Ý tưởng" provider="chatgpt" providerLabel="ChatGPT" isConnected={isGptConnected} busy={busy || aiLogin.busy} onLogin={aiLogin.login}>
            <div className="build-step-input-col">
              <textarea
                name="customerIdea"
                onChange={() => { setBuild(previous => (previous ? { ...previous, formula: undefined } : null)); saveFormDraft(formRef.current); }}
                disabled={submitting || busy}
                rows={3}
                defaultValue={value?.customerIdea || savedDraft.customerIdea}
                placeholder="Nhập ý tưởng video..."
                required
                minLength={10}
                maxLength={4000}
              />
              <div style={{ marginTop: "0.5rem" }}>
                <select name="country" className="styled-select" defaultValue={savedDraft.country || "Việt Nam"} onChange={() => { setBuild(previous => previous ? { ...previous, formula: undefined } : previous); saveFormDraft(formRef.current); }} disabled={submitting || busy}>
                  <option value="Mỹ (United States)">🇺🇸 Mỹ (United States)</option>
                  <option value="Việt Nam">🇻🇳 Việt Nam</option>
                  <option value="Nhật Bản (Japan)">🇯🇵 Nhật Bản (Japan)</option>
                  <option value="Hàn Quốc (South Korea)">🇰🇷 Hàn Quốc (South Korea)</option>
                  <option value="Trung Quốc (China)">🇨🇳 Trung Quốc (China)</option>
                  <option value="Anh (United Kingdom)">🇬🇧 Anh (United Kingdom)</option>
                  <option value="Pháp (France)">🇫🇷 Pháp (France)</option>
                  <option value="Đức (Germany)">🇩🇪 Đức (Germany)</option>
                </select>
              </div>
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
            <aside className={"build-step-result " + (build?.formula ? "is-ready has-preview" : "")}>
              <div className="build-result-heading"><div><strong><Check size={15} /> Công thức chủ đề</strong><small>{build?.formula ? "Công thức Markdown đã sẵn sàng" : "Kết quả Step 2"}</small></div><ResultStatus ready={Boolean(build?.formula)} busy={runningStage === 2} /></div>
              {build?.formula && <div className="build-result-details">
                <ResultRow icon={<FileText size={13} />} label="Tên công thức" value={typeof build.formula === "object" && build.formula !== null ? (build.formula as any).name || "Công thức chủ đề" : "Công thức Markdown"} />
                {typeof build.formula === "object" && build.formula !== null && <>
                  <ResultRow icon={<Lightbulb size={13} />} label="Chủ đề chính" value={(build.formula as any).coreTheme || "Đã phân tích"} />
                  <ResultRow icon={<Layers3 size={13} />} label="Module bắt buộc" value={`${Array.isArray((build.formula as any).mandatoryModules) ? (build.formula as any).mandatoryModules.length : 0} module`} />
                </>}
                <ResultRow icon={<FileText size={13} />} label="Định dạng" value="Structured Markdown" />
              </div>}
              {build?.formula && <div className="build-step-result-tooltip"><pre>{formulaDisplayText(build.formula).slice(0, 4000)}</pre></div>}
            </aside>
            {build?.formula && (
              <div className="formula-result-container" style={{ marginTop: "1rem", background: "var(--color-bg)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <strong style={{ color: "var(--color-accent)" }}>Dữ liệu Công thức (Markdown)</strong>
                  <button
                    type="button"
                    className="button outline"
                    style={{ padding: "4px 12px", fontSize: "0.85rem" }}
                    onClick={() => {
                      const text = formulaDisplayText(build.formula);
                      const blob = new Blob([text], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "formula_result.md";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Tải xuống Markdown
                  </button>
                </div>
                <pre style={{ maxHeight: "300px", overflow: "auto", fontSize: "0.85rem", whiteSpace: "pre-wrap", margin: 0 }}>
                  {formulaDisplayText(build.formula)}
                </pre>
              </div>
            )}
          </BuildStep>

          {/* BƯỚC 3: Ảnh phong cách */}
          <BuildStep stepNo={3} title="Ảnh phong cách" provider="chatgpt" providerLabel="ChatGPT" isConnected={isGptConnected} busy={busy || aiLogin.busy} onLogin={aiLogin.login}>
            <div className="build-step-input-col">
              <label className="style-dropzone">
                <ImageIcon size={24} />
                <span>Kéo thả hoặc chọn ảnh</span>
                <small>JPG, PNG, WEBP · {maxImageMb}MB/ảnh · tối đa {maxStyleImages}</small>
                <input
                  type="file"
                  name="styleImages"
                  accept={policy?.imageAccept || ".jpg,.jpeg,.png,.webp"}
                  multiple
                  required={!hasStyleFiles && !keepStyleImages}
                  disabled={busy || submitting}
                  onChange={async (event) => {
                    const files = [...(event.currentTarget.files || [])];
                    if (!files.length) return;
                    try {
                      const styleImages = await Promise.all(files.map(async (file) => ({
                        name: file.name,
                        type: file.type || "image/jpeg",
                        dataUrl: await fileToDataUrl(file),
                      })));
                      setStyleImages(styleImages);
                      saveFormDraft(formRef.current, { styleImages });
                    } catch (e) { setError((e as Error).message); }
                  }}
                />
              </label>
              {styleImages.length > 0 && <div className="style-image-preview">{styleImages.map(image =>
                <img key={image.name} src={image.dataUrl} alt={image.name} title={image.name} />
              )}</div>}
              {keepStyleImages && <small className="muted">Đang giữ {value?.sourceFiles?.styleImages?.length} ảnh style.</small>}
              <div style={{ marginTop: "0.5rem" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--color-muted)", display: "block", marginBottom: "0.2rem" }}>
                  Thời lượng video (5 - 25 phút):
                </label>
                <select
                  name="durationMinutes"
                  className="styled-select"
                  defaultValue={String(Number(savedDraft.durationSeconds || 300) / 60)}
                  disabled={busy || submitting}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value) || 5;
                    const secsInput = formRef.current?.elements.namedItem("durationSeconds") as HTMLInputElement | null;
                    if (secsInput) secsInput.value = String(mins * 60);
                    saveFormDraft(formRef.current);
                  }}
                >
                  <option value="5">⏱️ 5 phút (300s)</option>
                  <option value="10">⏱️ 10 phút (600s)</option>
                  <option value="15">⏱️ 15 phút (900s)</option>
                  <option value="20">⏱️ 20 phút (1200s)</option>
                  <option value="25">⏱️ 25 phút (1500s)</option>
                </select>
              </div>
            </div>
            <button
              className="button gradient-action build-step-btn"
              type="button"
              onClick={() => void generateChildren()}
              disabled={!canStep3 || (!hasStyleFiles && !keepStyleImages) || busy || submitting || runningStage > 0}
            >
              {runningStage === 3 ? <Spinner /> : <Sparkles size={16} />}
              {runningStage === 3 ? "Đang tạo 5 file…" : "Tạo 5 file"}
            </button>
            <aside className={"build-step-result " + (prepared ? "is-ready has-preview" : "")}>
              <div className="build-result-heading"><div><strong><Check size={15} /> Output</strong><small>{prepared ? "Đã tạo đủ tài nguyên theo chủ đề" : "Kết quả Step 3"}</small></div><ResultStatus ready={Boolean(prepared)} busy={runningStage === 3} readyLabel={`${prepared?.children?.length || 5} file`} /></div>
              {prepared && <div className="build-result-details build-result-chips">
                <ResultRow icon={<Layers3 size={13} />} label="Tài nguyên đầu ra" value={`${prepared.children.length} file con`} />
                <div className="build-result-chip-list">{prepared.children.map(child => <span key={child.name} className="build-result-chip"><Check size={11} />{child.name.replace(/\.md$/i, "")}</span>)}</div>
              </div>}
              {prepared && <div className="build-step-result-tooltip"><pre>{JSON.stringify(prepared.children, null, 2)}</pre></div>}
            </aside>
          </BuildStep>
        </div>

        <input
          type="hidden"
          name="language"
          value={String(build?.content?.sourceLanguage || savedDraft.country || "Việt Nam").trim() || "Việt Nam"}
          readOnly
        />
        <input type="hidden" name="durationSeconds" defaultValue={value?.durationSeconds || savedDraft.durationSeconds || 300} />

        <ErrorBox message={error || aiLogin.error} />
        {aiLogin.attempt && <div role="status" className="provider-login-status">
          {aiLogin.attempt.message || 'Đang chờ đăng nhập trên Chrome.'}
          <button type="button" className="button compact" onClick={() => void aiLogin.cancel()}>Hủy kiểm tra</button>
        </div>}

        <div className="form-footer">
          <span className="muted small-text">
            Step 1 dùng NotebookLM + Gemini · Step 2 & 3 dùng ChatGPT.
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
                        <FileText size={16} /><span>{file.filename} · {file.characters.toLocaleString("vi-VN")} ký tự</span>
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
