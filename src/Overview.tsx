import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  FolderKanban,
  Blocks,
  CheckCheck,
  Timer,
  Sparkles,
  Play,
  Search,
  Layers3,
} from "lucide-react";
import { api } from "./api";
import { useRemote } from "./hooks";
import type { Dashboard, User, Project, Template } from "./types";
import {
  Badge,
  date,
  Empty,
  ErrorBox,
  Field,
  Loading,
  Modal,
  Spinner,
} from "./ui";
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={"/projects/" + project.id} className="project-card">
      <div className="project-art">
        <div className="art-grid" />
        <span className="art-number">
          {String(project.sceneCount).padStart(2, "0")}
        </span>
        <span className="art-orbit" />
        <Layers3 className="art-icon" size={30} />
        <span className="art-caption">{project.templateName}</span>
        <span className="art-play">
          <ArrowUpRight size={22} />
        </span>
      </div>
      <div className="project-card-body">
        <div className="row">
          <span className="muted small-text">
            {project.sceneCount} cảnh · {project.sceneDurationSeconds}s / cảnh
          </span>
          <Badge status={project.status} />
        </div>
        <h3>{project.name}</h3>
        <p>{project.rawStory}</p>
        <div className="project-card-footer">
          <span className="tiny-avatar">S</span>
          <span>Cập nhật {date(project.updatedAt)}</span>
          <ArrowRight size={17} />
        </div>
      </div>
    </Link>
  );
}
export function Overview({ user }: { user: User }) {
  const { data, error } = useRemote<Dashboard>("/dashboard", 0, 6000);
  if (!data) return error ? <ErrorBox message={error} /> : <Loading />;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TỔNG QUAN</span>
          <h1>Hôm nay, bạn muốn kể điều gì?</h1>
          <p>Chào {user.name}. Mọi ý tưởng đều có một nơi để bắt đầu.</p>
        </div>
        <Link to="/projects?new=1" className="button primary">
          <Plus size={18} /> Tạo dự án
        </Link>
      </div>
      <ErrorBox message={error} />
      <section className="welcome-banner">
        <div className="banner-copy">
          <span className="banner-label">
            <Sparkles size={15} /> SÁNG TẠO THEO CÁCH CỦA BẠN
          </span>
          <h2>
            Từ ý tưởng đầu tiên
            <br />
            đến nội dung hoàn chỉnh.
          </h2>
          <p>
            Một template phù hợp. Một quy trình liền mạch.
            <br />
            Dành nhiều thời gian hơn cho câu chuyện của bạn.
          </p>
          <Link to="/templates" className="button dark">
            Mở Templates <ArrowRight size={17} />
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="float-card fc-back">
            <span className="mini-line" />
            <span className="mini-line short" />
            <div className="mini-mountain" />
          </div>
          <div className="float-card fc-front">
            <span className="mini-tag">YOUR NEXT STORY</span>
            <div className="mini-sun" />
            <div className="mini-landscape" />
            <div className="mini-timeline">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <span className="banner-spark">
            <Sparkles size={24} />
          </span>
          <span className="banner-check">
            <CheckCheck size={18} /> Ready to create
          </span>
        </div>
      </section>
      <div className="stats-grid">
        {[
          {
            label: "Dự án của bạn",
            value: data.stats.projects,
            icon: FolderKanban,
            color: "purple",
          },
          {
            label: "Template đã tạo",
            value: data.stats.templates,
            icon: Blocks,
            color: "blue",
          },
          {
            label: "Dự án hoàn tất",
            value: data.stats.completed,
            icon: CheckCheck,
            color: "green",
          },
          {
            label: "Tác vụ đang chạy",
            value: data.stats.activeJobs,
            icon: Timer,
            color: "amber",
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <span className={"stat-icon " + s.color}>
              <s.icon size={21} />
            </span>
            <span className="stat-label">{s.label}</span>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
            <span className="stat-note">Trong không gian của bạn</span>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <h2>Tiếp tục sáng tạo</h2>
          <p>Những dự án gần đây của bạn.</p>
        </div>
        <Link className="text-link" to="/projects">
          Tất cả dự án <ArrowRight size={16} />
        </Link>
      </div>
      {data.projects.length ? (
        <div className="project-grid">
          {data.projects.slice(0, 3).map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          <Link to="/projects?new=1" className="new-project-card">
            <span>
              <Plus size={25} />
            </span>
            <h3>Ý tưởng tiếp theo của bạn</h3>
            <p>Bắt đầu một dự án mới</p>
          </Link>
        </div>
      ) : (
        <Empty
          title="Bắt đầu câu chuyện đầu tiên"
          action={
            <Link className="button primary" to="/projects?new=1">
              <Plus size={17} /> Tạo dự án
            </Link>
          }
        >
          Chọn template và nhập ý tưởng. Studio sẽ lo các bước tiếp theo.
        </Empty>
      )}
      {data.mode === "demo" && (
        <div className="demo-note">
          <span className="tag">DEMO</span> Bạn đang trải nghiệm quy trình với
          nội dung và media mô phỏng.
        </div>
      )}
    </>
  );
}
export function NewProject({
  open,
  onClose,
  templates,
  defaultTemplateId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  defaultTemplateId?: string;
  onCreated?: (project: Project) => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const project = await api<Project>("/projects", "POST", {
        name: form.get("name"),
        templateId: form.get("templateId"),
        rawStory: form.get("rawStory"),
      });
      onClose();
      onCreated?.(project);
      navigate("/projects/" + project.id);
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
      title="Tạo dự án mới"
      description="Chọn khuôn mẫu, rồi kể cho Studio ý tưởng của bạn."
    >
      <form onSubmit={submit} className="form-stack">
        <Field label="Tên dự án">
          <input
            name="name"
            placeholder="Ví dụ: Vì sao bầu trời có màu xanh?"
            required
            minLength={2}
            maxLength={120}
          />
        </Field>
        <Field label="Template">
          <select name="templateId" required defaultValue={defaultTemplateId || ""}>
            <option value="" disabled>
              Chọn template đã xuất bản
            </option>
            {templates
              .filter((t) => t.versions.some((v) => v.published))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </Field>


        <Field
          label="Nội dung đầu vào"
          hint="Template giữ cấu trúc, nội dung này dùng cho dự án."
        >
          <textarea
            name="rawStory"
            rows={6}
            placeholder="Dán nội dung, câu chuyện hoặc mô tả chi tiết chủ đề bạn muốn thực hiện…"
            required
            minLength={10}
            maxLength={60000}
          />
        </Field>
        <ErrorBox message={error} />
        <div className="form-footer">
          <button type="button" className="button" onClick={onClose}>
            Hủy
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Spinner /> : <Plus size={17} />} Tạo dự án
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Projects({ notify: _notify }: { notify: (s: string) => void }) {
  const { data, error } = useRemote<Project[]>("/projects", 0, 5000);
  const templates = useRemote<Template[]>("/templates");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchParams] = useSearchParams();
  const [create, setCreate] = useState(
    searchParams.has("new"),
  );
  useEffect(() => { if (searchParams.has("new")) setCreate(true); }, [searchParams]);
  const visible = data?.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      `${p.name} ${p.templateName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CREATIVE WORKSPACE</span>
          <h1>Dự án của tôi</h1>
          <p>Mỗi ý tưởng một hành trình. Tất cả ở cùng một nơi.</p>
        </div>
        <button className="button primary" onClick={() => setCreate(true)}>
          <Plus size={18} /> Tạo dự án
        </button>
      </div>
      <div className="toolbar">
        <div className="segmented">
          {[
            ["all", "Tất cả"],
            ["DONE", "Hoàn tất"],
            ["DRAFT", "Bản nháp"],
          ].map(([v, label]) => (
            <button
              className={filter === v ? "selected" : ""}
              key={v}
              onClick={() => setFilter(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Tìm dự án"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm dự án…"
          />
        </label>
      </div>
      <ErrorBox message={error} />
      {!data && !error ? (
        <Loading />
      ) : visible?.length ? (
        <div className="project-grid">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <Empty
          title={search ? "Không có dự án phù hợp" : "Chưa có dự án nào"}
          action={
            <button className="button primary" onClick={() => setCreate(true)}>
              <Play size={16} /> Bắt đầu dự án
            </button>
          }
        >
          Chọn template và thêm nội dung để bắt đầu.
        </Empty>
      )}
      <NewProject
        open={create}
        onClose={() => setCreate(false)}
        templates={templates.data || []}
      />
    </>
  );
}
