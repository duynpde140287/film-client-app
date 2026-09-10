import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Pause,
  FileText,
  Mic,
  Image as ImageIcon,
  Video,
  Download,
  Check,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Clock3,
  Layers3,
  ChevronRight,
  Scissors,
} from "lucide-react";
import { api } from "./api";
import { useRemote } from "./hooks";
import type { Project, Step, Job } from "./types";
import {
  Badge,
  Empty,
  ErrorBox,
  JsonView,
  Loading,
  Media,
  Spinner,
} from "./ui";
function Output({ step }: { step: Step }) {
  const output = step.output;
  if (!output)
    return (
      <Empty title="Nội dung sẽ xuất hiện ở đây">
        Chạy bước này khi đã đủ đầu vào, hoặc chọn “Chạy tự động” để Studio xử
        lý quy trình.
      </Empty>
    );
  if (step.stepNo === 1)
    return (
      <div className="story-output">
        {output.paragraphs.map((p: any, i: number) => (
          <p key={i}>{p.text}</p>
        ))}
        {output.characters.length > 0 && (
          <div className="identity-notes">
            <h4>Chủ thể trong nội dung</h4>
            {output.characters.map((c: any, i: number) => (
              <p key={i}>
                <strong>{c.role}</strong> — {c.note}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  if (step.stepNo === 2)
    return (
      <div className="identity-grid">
        {output.characters.map((c: any) => (
          <div className="identity-card" key={c.token}>
            <span className="identity-avatar">
              <Layers3 size={26} />
            </span>
            <strong>{c.token}</strong>
            <span className="tag">{c.look}</span>
            <p>{c.portraitPrompt}</p>
          </div>
        ))}
      </div>
    );
  if (step.stepNo === 3)
    return (
      <div>
        {output.chapters.map((chapter: any) => (
          <section className="chapter" key={chapter.num}>
            <h3>
              <span>Chương {chapter.num}</span>
              {chapter.heading}
            </h3>
            {chapter.scenes.map((s: any) => (
              <div className="outline-scene" key={s.index}>
                <span>{String(s.index).padStart(2, "0")}</span>
                <p>{s.description}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  if (step.stepNo === 4)
    return (
      <div>
        {output.lines.map((line: any) => (
          <div className="narration-line" key={line.sceneIndex}>
            <span className="scene-number">
              {String(line.sceneIndex).padStart(2, "0")}
            </span>
            <Mic size={17} />
            <p>{line.text}</p>
          </div>
        ))}
      </div>
    );
  return (
    <div>
      {output.prompts.map((p: any) => (
        <details className="prompt-output" key={p.sceneIndex}>
          <summary>
            <ImageIcon size={17} />
            <strong>Cảnh {p.sceneIndex}</strong>
            <span>{p.characters.join(", ")}</span>
            <ChevronDown size={16} />
          </summary>
          <p>{p.prompt}</p>
        </details>
      ))}
    </div>
  );
}
export function Workspace({
  notify,
  onActivate,
}: {
  notify: (message: string) => void;
  onActivate?: (project: Project | null) => void;
}) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const path = "/projects/" + id;
  const {
    data: project,
    error: loadError,
    setData,
  } = useRemote<Project>(path, 0, 2500);
  // Tab được truyền qua query string từ sidebar project steps
  const defaultTab = searchParams.get("tab") || "script";
  const [tab, setTab] = useState(defaultTab),
    [stepNo, setStepNo] = useState(1),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("all"),
    [override, setOverride] = useState("");

  // Báo sidebar biết project đang active
  useEffect(() => {
    if (project && onActivate) onActivate(project);
    return () => { if (onActivate) onActivate(null); };
  }, [project?.id]);

  async function command(
    action: string,
    body: unknown = {},
    message = "Đã gửi yêu cầu.",
  ) {
    setBusy(action);
    setError("");
    try {
      await api(path + "/" + action, "POST", body);
      setData(await api<Project>(path));
      notify(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (!project)
    return loadError ? <ErrorBox message={loadError} /> : <Loading />;
  const activeStep = project.steps.find((s) => s.stepNo === stepNo)!;
  const running = ["QUEUED", "RUNNING"].includes(project.automationStatus);
  const activeJobs = project.jobs.filter(
    (j) => j.kind === tab && j.status !== "STALE",
  );
  const exportJob = project.exports.find((j) => j.status === "DONE");
  const actionable = project.actions?.[tab];
  const tabs = [
    { id: "script", label: "Script", icon: FileText },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "image", label: "Hình ảnh", icon: ImageIcon },
    { id: "video", label: "Video", icon: Video },
    { id: "capcut", label: "CapCut", icon: Scissors },
    { id: "export", label: "QC & Xuất", icon: Download },
  ];
  return (
    <>
      <Link className="back-link" to="/projects">
        <ArrowLeft size={16} /> Dự án của tôi
      </Link>
      <div className="page-heading project-heading">
        <div>
          <div className="row heading-status">
            <h1>{project.name}</h1>
            <Badge status={project.status} />
          </div>
          <p>
            <span>
              {project.templateName} · v{project.templateVersion}
            </span>
            <span>
              {" "}
              <span className="dot-divider">•</span> {project.sceneCount} cảnh{" "}
              <span className="dot-divider">•</span>{" "}
              {project.sceneDurationSeconds}s / cảnh
            </span>
          </p>
        </div>
        <div className="button-group">
          {running ? (
            <button
              className="button"
              disabled={!!busy}
              onClick={() =>
                void command("pause", {}, "Sẽ tạm dừng sau tác vụ hiện tại.")
              }
            >
              <Pause size={17} /> Tạm dừng
            </button>
          ) : (
            <button
              className="button primary"
              disabled={!!busy || !project.actions?.automation.ready}
              onClick={() =>
                void command("run", {}, "Quy trình tự động đã vào hàng đợi.")
              }
            >
              {busy === "run" ? <Spinner /> : <Sparkles size={17} />} Chạy tự
              động
            </button>
          )}
        </div>
      </div>
      {project.mode === "demo" && (
        <div className="demo-note compact-note">
          <span className="tag">DEMO</span> Nội dung mô phỏng, ảnh đồ họa và âm
          thanh kiểm thử. Video xuất dùng để kiểm tra quy trình.
        </div>
      )}
      <ErrorBox
        message={error || loadError || project.automationError?.message}
      />
      <div className="pipeline-strip">
        {Object.entries(project.progress).map(([kind, p], i) => (
          <div key={kind} className={p.done === p.total ? "completed" : ""}>
            <span className="pipeline-circle">
              {p.done === p.total ? <Check size={15} /> : i + 1}
            </span>
            <div>
              <strong>
                {{
                  script: "Nội dung",
                  voice: "Voice",
                  image: "Hình ảnh",
                  video: "Video",
                }[kind] || kind}
              </strong>
              <small>
                {p.done} / {p.total} hoàn tất
              </small>
            </div>
            <div className="mini-progress">
              <span
                style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }}
              />
            </div>
            {i < 3 && <ChevronRight className="pipeline-chevron" size={17} />}
          </div>
        ))}
      </div>
      <div className="workspace-tabs tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setFilter("all");
            }}
            className={tab === t.id ? "active" : ""}
          >
            <t.icon size={17} />
            {t.label}
            {project.progress[t.id] && (
              <span className="tab-count">{project.progress[t.id].done}</span>
            )}
          </button>
        ))}
        <span className="live-status">
          {running ? (
            <>
              <Spinner /> Đang tự động xử lý
            </>
          ) : (
            <>
              <i /> Dữ liệu đã lưu
            </>
          )}
        </span>
      </div>
      {tab === "script" ? (
        <div className="script-workspace">
          <aside className="step-nav">
            <span className="nav-label">QUY TRÌNH NỘI DUNG</span>
            {project.steps.map((step) => (
              <button
                className={stepNo === step.stepNo ? "selected" : ""}
                key={step.stepNo}
                onClick={() => {
                  setStepNo(step.stepNo);
                  setOverride("");
                }}
              >
                <span
                  className={
                    "step-index " + (step.status === "DONE" ? "done" : "")
                  }
                >
                  {step.status === "DONE" ? <Check size={15} /> : step.stepNo}
                </span>
                <div>
                  <strong>{step.name}</strong>
                  <small>
                    {step.status === "DONE"
                      ? `Phiên bản ${step.version}`
                      : step.status === "RUNNING"
                        ? "Đang xử lý"
                        : step.readiness.ready
                          ? "Sẵn sàng chạy"
                          : "Chờ đầu vào"}
                  </small>
                </div>
                <ChevronRight size={15} />
              </button>
            ))}
            <div className="step-note">
              <Layers3 size={18} />
              <p>
                Các cảnh được xác lập ở bước 3 và giữ đồng bộ xuyên suốt quy
                trình.
              </p>
            </div>
          </aside>
          <section className="step-panel">
            <div className="step-panel-heading">
              <div>
                <span className="eyebrow">
                  STEP {String(activeStep.stepNo).padStart(2, "0")}
                </span>
                <h2>{activeStep.name}</h2>
              </div>
              <button
                className="button primary"
                disabled={!!busy || running || !activeStep.readiness.ready}
                onClick={() =>
                  void command(
                    `steps/${stepNo}/run`,
                    override ? { inputOverride: override } : {},
                    "Đã lưu kết quả bước " + stepNo,
                  )
                }
              >
                {busy.startsWith("steps/") ? (
                  <Spinner />
                ) : activeStep.version ? (
                  <RefreshCw size={16} />
                ) : (
                  <Play size={16} />
                )}{" "}
                {activeStep.version ? "Chạy lại bước" : "Tạo nội dung"}
              </button>
            </div>
            {!activeStep.readiness.ready && (
              <div className="readiness-note">
                <Clock3 size={16} />
                {activeStep.readiness.reasons.join(" · ")}
              </div>
            )}
            <ErrorBox message={activeStep.error?.message} />
            <div className="step-content">
              <Output step={activeStep} />
            </div>
            <details className="advanced">
              <summary>
                Đầu vào & dữ liệu chi tiết <ChevronDown size={15} />
              </summary>
              <h4>Nội dung dự án</h4>
              <p className="raw-story">{project.rawStory}</p>
              <label className="field">
                <span>Đầu vào tùy chỉnh cho lần chạy này (tùy chọn)</span>
                <textarea
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                  placeholder="Để trống để sử dụng đầu vào hiện có."
                  rows={4}
                />
              </label>
              <details>
                <summary>Đầu vào từ các bước trước</summary>
                <pre className="code-view">{activeStep.inputSuggestion}</pre>
              </details>
              {activeStep.output && (
                <details>
                  <summary>Kết quả có cấu trúc</summary>
                  <JsonView value={activeStep.output} />
                </details>
              )}
            </details>
          </section>
        </div>
      ) : tab === "capcut" ? (
        <div className="placeholder-page">
          <span className="placeholder-icon">
            <Scissors size={48} />
          </span>
          <h2>CapCut Export</h2>
          <p>
            Tự động push dự án này vào CapCut để chỉnh sửa nâng cao, thêm
            hiệu ứng và xuất bản.
          </p>
          <span className="tag">Sắp ra mắt</span>
        </div>
      ) : tab === "export" ? (
        <div className="export-layout">
          <section className="panel qc-panel">
            <span className="big-icon">
              <ShieldCheck size={30} />
            </span>
            <h2>Kiểm tra trước khi xuất</h2>
            <p>
              Studio kiểm tra dữ liệu 5 bước, media và tính toàn vẹn của từng
              cảnh.
            </p>
            {project.qc && <Badge status={project.qc.status} />}
            <div className="qc-results">
              {project.qc?.errors.map((e, i) => (
                <ErrorBox key={i} message={e.message || e.code} />
              ))}
              {project.qc?.missing.map((m, i) => (
                <div className="missing-media" key={i}>
                  Cảnh {m.sceneIndex} · Thiếu {m.kind}
                </div>
              ))}
            </div>
            <button
              className="button"
              disabled={!!busy}
              onClick={() => void command("qc", {}, "Đã kiểm tra chất lượng.")}
            >
              {busy === "qc" ? <Spinner /> : <ShieldCheck size={17} />} Kiểm tra
              QC
            </button>
          </section>
          <section className="panel export-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">THÀNH PHẨM</span>
                <h2>Video của bạn</h2>
              </div>
              {exportJob && <Badge status="DONE" />}
            </div>
            {exportJob ? (
              <>
                <Media job={exportJob} />
                <div className="export-download">
                  <span className="muted">
                    MP4 · {exportJob.duration?.toFixed(1)} giây
                  </span>
                  <Media job={exportJob} download />
                </div>
              </>
            ) : (
              <>
                <Empty title="Video đang chờ được hoàn thiện">
                  Hoàn tất các cảnh và vượt qua kiểm tra QC để xuất video.
                </Empty>
                <button
                  className="button primary"
                  disabled={!!busy || !project.actions?.export.ready}
                  onClick={() =>
                    void command("export", {}, "Video đã vào hàng đợi xuất.")
                  }
                >
                  <Download size={17} /> Xuất video MP4
                </button>
                {project.actions?.export.reasons.map((reason) => (
                  <p className="muted small-text" key={reason}>
                    {reason}
                  </p>
                ))}
              </>
            )}
            {project.exports
              .filter((j) => j.status !== "DONE" && j.status !== "STALE")
              .map((j) => (
                <div className="export-job" key={j.id}>
                  <Badge status={j.status} />
                  <span>{j.error?.message}</span>
                  {j.status === "ERROR_FINAL" && (
                    <button
                      className="button"
                      disabled={!!busy}
                      onClick={() => void command(`media/${j.id}/retry`)}
                    >
                      Thử lại
                    </button>
                  )}
                </div>
              ))}
          </section>
        </div>
      ) : (
        <section className="media-workspace">
          <div className="media-controls">
            <div>
              <h2>
                {tabs.find((t) => t.id === tab)?.label} theo cảnh{" "}
                <span className="count-pill">{project.scenes.length}</span>
              </h2>
              <p>
                {tab === "voice"
                  ? "Lời đọc được đồng bộ với từng cảnh trong dàn ý."
                  : tab === "image"
                    ? "Ảnh đầu khung cho mỗi cảnh, theo prompt đã được kiểm tra."
                    : "Các clip được tạo từ ảnh đầu khung của từng cảnh."}
              </p>
            </div>
            <button
              className="button primary"
              disabled={!!busy || !actionable?.ready}
              onClick={() =>
                void command(
                  "media/" + tab,
                  {},
                  "Các cảnh đã được đưa vào hàng đợi.",
                )
              }
            >
              {busy === "media/" + tab ? <Spinner /> : <Play size={16} />} Tạo
              tất cả
            </button>
          </div>
          {actionable?.reasons.map((reason) => (
            <div className="readiness-note" key={reason}>
              {reason}
            </div>
          ))}
          <div className="media-filter">
            <div className="segmented">
              {[
                ["all", "Tất cả"],
                ["DONE", "Hoàn tất"],
                ["QUEUED", "Đang chờ"],
                ["ERROR_FINAL", "Có lỗi"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  className={filter === v ? "selected" : ""}
                  onClick={() => setFilter(v)}
                >
                  {label}{" "}
                  {v === "all"
                    ? `(${project.scenes.length})`
                    : `(${activeJobs.filter((j) => j.status === v).length})`}
                </button>
              ))}
            </div>
          </div>
          {!project.scenes.length ? (
            <Empty title="Chưa có cảnh">
              Hoàn tất dàn ý ở Step 3 để hiện danh sách cảnh.
            </Empty>
          ) : (
            <div className="scene-list">
              {project.scenes.map((scene) => {
                const job: Job | undefined = activeJobs.find(
                  (j) => j.sceneIndex === scene.index,
                );
                if (filter !== "all" && job?.status !== filter) return null;
                return (
                  <article className="scene-card" key={scene.index}>
                    <div className="scene-preview">
                      {tab !== "voice" && job?.url ? (
                        <Media job={job} />
                      ) : scene.assets.image ? (
                        <Media job={scene.assets.image} />
                      ) : (
                        <div className="scene-placeholder">
                          {tab === "voice" ? (
                            <Mic size={27} />
                          ) : tab === "image" ? (
                            <ImageIcon size={27} />
                          ) : (
                            <Video size={27} />
                          )}
                        </div>
                      )}
                      <span className="scene-preview-label">
                        SCENE {String(scene.index).padStart(3, "0")}
                      </span>
                    </div>
                    <div className="scene-body">
                      <div className="scene-meta">
                        <strong>
                          Cảnh {String(scene.index).padStart(2, "0")}
                        </strong>
                        <span>Chương {scene.chapter}</span>
                        <span>
                          {job?.duration || project.sceneDurationSeconds}s
                        </span>
                        {job && <Badge status={job.status} />}
                      </div>
                      <p>
                        {tab === "voice"
                          ? scene.voiceText || scene.description
                          : scene.description}
                      </p>
                      {tab === "voice" && job?.url && <Media job={job} />}
                      <ErrorBox message={job?.error?.message} />
                      {tab !== "voice" && scene.prompt && (
                        <details className="scene-prompt">
                          <summary>
                            Xem prompt <ChevronDown size={13} />
                          </summary>
                          <p>{scene.prompt}</p>
                        </details>
                      )}
                    </div>
                    <div className="scene-actions">
                      <button
                        className="button compact"
                        disabled={
                          !!busy ||
                          running ||
                          (!job && !actionable?.ready) ||
                          !!(
                            job && ["QUEUED", "PROCESSING"].includes(job.status)
                          )
                        }
                        onClick={() =>
                          void command(
                            job ? `media/${job.id}/retry` : "media/" + tab,
                            job ? {} : { sceneIndex: scene.index },
                            "Đã xếp hàng cảnh " + scene.index,
                          )
                        }
                      >
                        <RefreshCw size={14} />
                        {job ? "Tạo lại" : "Tạo cảnh"}
                      </button>
                      {job?.url && <Media job={job} download />}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </>
  );
}
