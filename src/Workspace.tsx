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
  Bot,
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
  const [searchParams, setSearchParams] = useSearchParams();
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
    [overrides, setOverrides] = useState<Record<number, string>>({}),
    [runTarget, setRunTarget] = useState("full");
  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  useEffect(() => { if (project && project.id === id) onActivate?.(project); else if (loadError) onActivate?.(null); }, [project, id, loadError, onActivate]);

  useEffect(() => { setOverrides({}); }, [id]);

  async function command(
    action: string,
    body: unknown = {},
    message = "Đã gửi yêu cầu.",
  ) {
    setBusy(action);
    setError("");
    try {
      await api(path + "/" + action, "POST", body);
      const refreshed = await api<Project>(path);
      setData(refreshed);
      if (action.startsWith("steps/")) setStepNo(refreshed.suggestedStep);
      notify(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function triggerAutoRun() {
    await command("scripts/run", {target: runTarget}, "Đã xếp hàng tạo script.");
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
  const actionReasons = (tab === "script" ? project.actions?.scripts : project.actions?.[tab])?.reasons || [];
  const needsChatGpt = actionReasons.some((reason) => /chatgpt|gpt/i.test(reason));
  const needsVeo3 = actionReasons.some((reason) => /veo\s*3|veo3/i.test(reason));
  const scriptsReady = project.actions?.scripts?.ready !== false;
  const scriptsReasons = project.actions?.scripts?.reasons || [];
  const selectedScriptTarget = runTarget.trim().toLowerCase();
  const scriptTargetNo =
    selectedScriptTarget === "full"
      ? 5
      : Math.min(5, Math.max(1, Number(selectedScriptTarget) || 1));
  const tabs = [
    { id: "script", label: "Script", icon: FileText },
    { id: "voice", label: "Voice", icon: Mic },
    { id: "image", label: "Image", icon: ImageIcon },
    { id: "video", label: "Video", icon: Video },
    { id: "capcut", label: "CapCut", icon: Scissors },
    { id: "export", label: "Export", icon: Download },
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
              {busy === "run" ? <Spinner /> : <Sparkles size={17} />} Auto video
            </button>
          )}
          {needsChatGpt && (
            <Link className="button compact provider-cta" to="/settings">
              <Bot size={15} /> Đăng nhập ChatGPT
            </Link>
          )}
          {needsVeo3 && (
            <Link className="button compact provider-cta" to="/settings">
              <Video size={15} /> Đăng nhập Veo 3
            </Link>
          )}
        </div>
      </div>
      <div className="auto-run-bar step-run-card">
        <div className="auto-run-label">
          <Sparkles size={17} className="text-accent" />
          <div>
            <strong>Chạy script</strong>
            <span>{selectedScriptTarget === "full" ? "Full 5 step" : `Đến Step ${scriptTargetNo}`}</span>
          </div>
        </div>
        <div className="milestone-track" role="radiogroup" aria-label="Chọn mốc tạo script">
          {[1, 2, 3, 4, 5].map((no) => (
            <button
              type="button"
              key={no}
              className={`milestone-chip ${scriptTargetNo >= no ? "is-checked" : ""} ${selectedScriptTarget === String(no) ? "is-current" : ""}`}
              onClick={() => setRunTarget(String(no))}
              disabled={running || !!busy}
            >
              <span>{scriptTargetNo >= no ? <Check size={13} /> : no}</span>
              <small>{no === 1 ? "1" : `1-${no}`}</small>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`button compact ${selectedScriptTarget === "full" ? "primary" : ""}`}
          onClick={() => setRunTarget("full")}
          disabled={running || !!busy}
        >
          Full
        </button>
        <div className="auto-run-actions">
          {running ? (
            <button
              className="button"
              disabled={!!busy}
              onClick={() =>
                void command("pause", {}, "Sẽ tạm dừng sau tác vụ hiện tại.")
              }
            >
              <Pause size={16} /> Tạm dừng
            </button>
          ) : (
            <button
              className="button primary"
              disabled={!!busy || !project.actions?.scripts.ready}
              onClick={() => void triggerAutoRun()}
            >
              {busy === "scripts/run" || busy === "run" ? <Spinner /> : <Play size={16} />} Chạy
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
                  image: "Image",
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
              setSearchParams({tab: t.id});
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
        <div className="script-workspace-rows">
          <div className="script-step-list-header">
            <span className="col-header col-input">Văn bản đầu vào (Input)</span>
            <span className="col-header col-action">Thao tác tạo script</span>
            <span className="col-header col-output">Văn bản đầu ra (Output)</span>
          </div>
          <div className="script-step-rows">
            {project.steps.map((step) => {
              const sNo = step.stepNo;
              const hasOutput = !!step.output;
              const isStepBusy = busy === `steps/${sNo}/run`;
              const currentInput = overrides[sNo] !== undefined ? overrides[sNo] : (step.inputSuggestion || "");
              const isReady = step.readiness.ready;
              const sourceLabel =
                sNo === 1
                  ? "Nội dung dự án (Raw Story)"
                  : sNo === 2
                    ? "Dữ liệu Step 1 (Story)"
                    : sNo === 3
                      ? "Dữ liệu Step 2 (Character)"
                      : sNo === 4
                        ? "Dữ liệu gợi ý từ Step 3 (Outline)"
                        : "Dữ liệu gợi ý từ Step 3 (Outline)";

              return (
                <div
                  key={sNo}
                  className={`script-step-card ${hasOutput ? "is-done" : isReady ? "is-ready" : "is-waiting"} ${stepNo === sNo ? "is-selected" : ""}`}
                >
                  <div className="script-step-header-bar">
                    <div className="step-title-box">
                      <span className={`step-badge-num ${hasOutput ? "done" : ""}`}>
                        {hasOutput ? <Check size={14} /> : sNo}
                      </span>
                      <strong className="step-name">Bước {sNo}: {step.name}</strong>
                      <span className="step-source-tag">{sourceLabel}</span>
                    </div>
                    <div className="step-status-box">
                      {step.status === "DONE" ? (
                        <span className="status-tag done">Hoàn tất (v{step.version})</span>
                      ) : step.status === "RUNNING" ? (
                        <span className="status-tag running">Đang xử lý</span>
                      ) : isReady ? (
                        <span className="status-tag ready">Sẵn sàng tạo</span>
                      ) : (
                        <span className="status-tag waiting">Chờ bước trước</span>
                      )}
                    </div>
                  </div>

                  <div className="script-step-body">
                    {/* Cột 1: Text đầu vào */}
                    <div className="step-col col-input">
                      <div className="col-title-bar">
                        <label className="col-title" htmlFor={`step-input-${sNo}`}>
                          Text đầu vào
                        </label>
                        {overrides[sNo] !== undefined && overrides[sNo] !== (step.inputSuggestion || "") && (
                          <button
                            type="button"
                            className="button mini-btn text-btn"
                            onClick={() => {
                              setOverrides((prev) => {
                                const next = { ...prev };
                                delete next[sNo];
                                return next;
                              });
                            }}
                          >
                            Dùng lại gợi ý
                          </button>
                        )}
                      </div>
                      <div className="step-input-wrapper">
                        <textarea
                          id={`step-input-${sNo}`}
                          className="step-textarea"
                          rows={6}
                          value={currentInput}
                          placeholder={
                            isReady
                              ? "Tự nạp theo luồng Step."
                              : `Cần hoàn thành các bước trước (${step.readiness.reasons.join(", ")})`
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setOverrides((prev) => ({ ...prev, [sNo]: val }));
                          }}
                          disabled={running || !!busy}
                        />
                      </div>
                      {!isReady && !hasOutput && (
                        <div className="readiness-mini-note">
                          <Clock3 size={13} />
                          <span>{step.readiness.reasons.join(" · ")}</span>
                        </div>
                      )}
                    </div>

                    {/* Cột 2 (Ở giữa): Nút tạo script step */}
                    <div className="step-col col-action">
                      <div className="action-connector-line" />
                      <div className="action-button-box">
                        <button
                          type="button"
                          className={`button step-action-btn ${hasOutput ? "btn-rerun" : "primary"}`}
                          disabled={!!busy || running || !isReady || !scriptsReady}
                          onClick={() => {
                            setStepNo(sNo);
                            const hasCustomInput =
                              overrides[sNo] !== undefined &&
                              overrides[sNo] !== (step.inputSuggestion || "");
                            void command(
                              `steps/${sNo}/run`,
                              hasCustomInput ? { inputOverride: currentInput } : {},
                              `Đã tạo script cho Bước ${sNo} (${step.name})`,
                            );
                          }}
                          title={
                            !scriptsReady
                              ? scriptsReasons.join("\n")
                              : !isReady
                                ? step.readiness.reasons.join("\n")
                                : hasOutput
                                  ? `Chạy lại script Bước ${sNo}`
                                  : `Tạo script Bước ${sNo}`
                          }
                        >
                          {isStepBusy ? (
                            <Spinner />
                          ) : hasOutput ? (
                            <RefreshCw size={15} />
                          ) : (
                            <Play size={15} />
                          )}
                          <span>{hasOutput ? `Chạy lại B${sNo}` : `Tạo Step ${sNo}`}</span>
                        </button>
                        <span className="action-step-badge">Step {sNo}</span>
                      </div>
                      <div className="action-connector-line" />
                    </div>

                    {/* Cột 3: Text đầu ra */}
                    <div className="step-col col-output">
                      <div className="col-title-bar">
                        <span className="col-title">Text đầu ra</span>
                        {hasOutput && (
                          <span className="output-status-pill">Đã sinh script</span>
                        )}
                      </div>
                      <div className="step-output-wrapper">
                        {step.error ? (
                          <ErrorBox message={step.error.message} />
                        ) : hasOutput ? (
                          <div className="output-scroll-box">
                            <Output step={step} />
                          </div>
                        ) : (
                          <div className="output-empty-box">
                            <span className="muted">
                              {isReady
                                ? `Chưa có script Step ${sNo}.`
                                : `Chờ mở khóa Step ${sNo}.`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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


