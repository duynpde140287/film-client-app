import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Film, Scissors, Youtube } from "lucide-react";
import { api } from "./api";
import { useRemote } from "./hooks";
import type { Project } from "./types";
import { Empty, ErrorBox, Spinner } from "./ui";

type ExternalProvider = "youtube" | "capcut";

type AiConnection = {
  provider: string;
  label: string;
  loginUrl: string;
  connected: boolean;
  status: string;
  description: string;
  savedAt?: string | null;
};

const EXTERNAL_PROVIDER_UI: Record<ExternalProvider, {
  title: string;
  eyebrow: string;
  icon: typeof Youtube;
  openUrl: string;
  helper: string;
  emptyText: string;
}> = {
  youtube: {
    title: "YouTube Upload",
    eyebrow: "YOUTUBE",
    icon: Youtube,
    openUrl: "https://studio.youtube.com/",
    helper: "Dán session YouTube Studio để upload video đã xuất.",
    emptyText: "Video xuất xong sẽ hiện ở đây để đẩy sang YouTube.",
  },
  capcut: {
    title: "CapCut Export",
    eyebrow: "CAPCUT",
    icon: Scissors,
    openUrl: "https://www.capcut.com/",
    helper: "Dán session CapCut để lưu dự án/video sang CapCut.",
    emptyText: "Video xuất xong sẽ hiện ở đây để lưu sang CapCut.",
  },
};

export function ExternalSessionPage({ provider }: { provider: ExternalProvider }) {
  const config = EXTERNAL_PROVIDER_UI[provider];
  const Icon = config.icon;
  const [revision, setRevision] = useState(0);
  const [sessionCookie, setSessionCookie] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { data: connections, error: connectionsError } = useRemote<AiConnection[]>("/ai-sessions", revision);
  const { data: projects, error: projectsError } = useRemote<Project[]>("/projects", revision, 5000);
  const connection = connections?.find((item) => item.provider === provider);
  const videos = (projects || []).flatMap((project) =>
    (project.exports || []).map((job) => ({ project, job })),
  );

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api<AiConnection>("/ai-sessions", "POST", {
        provider,
        sessionCookie,
        label: config.title,
      });
      setSessionCookie("");
      setRevision((n) => n + 1);
      setNotice("Đã lưu session.");
      window.setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError("Lưu session thất bại: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="external-session-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.helper}</p>
        </div>
        <a className="button" href={config.openUrl} target="_blank" rel="noopener noreferrer">
          Mở nền tảng <ArrowRight size={16} />
        </a>
      </div>

      <ErrorBox message={error || connectionsError || projectsError} />
      {notice && <div className="settings-alert success" role="status"><Check size={16} /> {notice}</div>}

      <section className="settings-card settings-card-wide external-session-card">
        <div className="settings-card-title">
          <Icon size={18} />
          <div>
            <h2>Phiên đăng nhập</h2>
            <p>{connection?.connected ? "Đã lưu session." : "Chưa có session."}</p>
          </div>
        </div>
        <form className="session-paste-form" onSubmit={save}>
          <textarea
            value={sessionCookie}
            onChange={(e) => setSessionCookie(e.target.value)}
            placeholder="Dán cookie/session tại đây"
            required
            minLength={8}
            maxLength={8192}
            rows={5}
            autoComplete="off"
          />
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Check size={16} />} Lưu session
          </button>
        </form>
      </section>

      <section className="settings-card settings-card-wide external-video-card">
        <div className="settings-card-title">
          <Film size={18} />
          <div>
            <h2>Video / dự án</h2>
            <p>Các video đã xuất trong Studio.</p>
          </div>
        </div>
        {videos.length ? (
          <div className="external-video-list">
            {videos.map(({ project, job }) => (
              <div className="external-video-row" key={project.id + job.id}>
                <div>
                  <strong>{project.name}</strong>
                  <span>{project.templateName} · {job.duration || project.sceneCount * project.sceneDurationSeconds}s</span>
                </div>
                {job.url ? (
                  <a className="button compact" href={job.url} target="_blank" rel="noopener noreferrer">Mở video</a>
                ) : (
                  <span className="tag">READY</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Chưa có video">{config.emptyText}</Empty>
        )}
      </section>
    </div>
  );
}