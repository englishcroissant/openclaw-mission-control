import { html, nothing } from "lit";
import type { BoardTask } from "../controllers/home-data.ts";
import type { GitCommit, ProjectBoardData, ColumnKey } from "../controllers/project-board.ts";
import { COLUMNS, groupTasksByColumn, groupCommitsByDate } from "../controllers/project-board.ts";
import { formatRelativeTimestamp } from "../format.ts";

export type ProjectBoardProps = {
  data: ProjectBoardData;
  projectId: string;
  onBack: () => void;
  onMoveTask: (taskId: string, newState: string) => void;
  onTaskDetail: (taskId: string | null) => void;
  onCommitClick: (hash: string | null) => void;
  onToggleShowAllDone: () => void;
  onRefresh: () => void;
  chatOpen: boolean;
  onOpenChat: () => void;
};

function priorityBadge(priority: string | undefined) {
  if (!priority) return nothing;
  const p = priority.toLowerCase();
  return html`<span class="badge badge-priority-${p}">${p.toUpperCase()}</span>`;
}

function reviewTypeBadge(reviewType: string | undefined) {
  if (!reviewType) return nothing;
  const labels: Record<string, string> = {
    "sam-required": "🧑 Sam Review",
    "peer-qa": "👥 Peer QA",
    auto: "🤖 Auto",
  };
  return html`<span class="badge badge-review">${labels[reviewType] || reviewType}</span>`;
}

function renderTaskCard(
  task: BoardTask,
  columnKey: ColumnKey,
  onTaskDetail: (id: string) => void,
  onMoveTask: (taskId: string, newState: string) => void,
) {
  const moveTargets = COLUMNS.filter((c) => c.key !== columnKey);

  return html`
    <article class="board-task-card" aria-label="Task ${task.id}: ${task.title}">
      <button
        class="board-task-card-main"
        @click=${() => onTaskDetail(task.id)}
        aria-label="View details for ${task.id}"
      >
        <div class="task-card-header">
          <code class="task-id">${task.id}</code>
          ${priorityBadge(task.priority)}
          ${columnKey === "review" ? reviewTypeBadge(task.reviewType) : nothing}
        </div>
        <h4 class="task-title">${task.title}</h4>
        <div class="task-meta">
          ${task.assignee ? html`<span class="task-assignee">@${task.assignee}</span>` : nothing}
          ${task.created
            ? html`<span class="task-date">${formatRelativeTimestamp(new Date(task.created).getTime())}</span>`
            : nothing}
        </div>
      </button>
      <div class="task-move-actions">
        ${moveTargets.map(
          (col) => html`
            <button
              class="btn btn-xs task-move-btn"
              @click=${() => onMoveTask(task.id, col.key)}
              aria-label="Move to ${col.label}"
              title="Move to ${col.label}"
            >
              → ${col.label}
            </button>
          `,
        )}
      </div>
    </article>
  `;
}

function renderColumn(
  columnKey: ColumnKey,
  label: string,
  tasks: BoardTask[],
  allDoneCount: number,
  showAllDone: boolean,
  onTaskDetail: (id: string) => void,
  onMoveTask: (taskId: string, newState: string) => void,
  onToggleShowAllDone: () => void,
) {
  return html`
    <section class="board-column" aria-label="${label} column">
      <header class="board-column-header">
        <h3>${label}</h3>
        <span class="board-column-count" aria-label="${tasks.length} tasks">${tasks.length}</span>
      </header>
      <div class="board-column-tasks" role="list">
        ${tasks.map((t) => renderTaskCard(t, columnKey, onTaskDetail, onMoveTask))}
        ${tasks.length === 0 ? html`<p class="board-empty">No tasks</p>` : nothing}
      </div>
      ${columnKey === "done" && allDoneCount > tasks.length
        ? html`
            <button class="btn btn-xs board-view-all" @click=${onToggleShowAllDone}>
              ${showAllDone ? "Show recent only" : `View all (${allDoneCount} total)`}
            </button>
          `
        : nothing}
    </section>
  `;
}

function renderTaskDetailModal(
  task: BoardTask | undefined,
  onClose: () => void,
) {
  if (!task) return nothing;

  return html`
    <div class="modal-overlay" @click=${onClose} role="dialog" aria-modal="true" aria-label="Task detail">
      <div class="modal-content task-detail-modal" @click=${(e: Event) => e.stopPropagation()}>
        <header class="modal-header">
          <div>
            <code class="task-id">${task.id}</code>
            ${priorityBadge(task.priority)}
            ${reviewTypeBadge(task.reviewType)}
          </div>
          <button class="btn btn-sm modal-close" @click=${onClose} aria-label="Close">✕</button>
        </header>
        <h3 class="task-detail-title">${task.title}</h3>
        ${task.description
          ? html`<p class="task-detail-desc">${task.description}</p>`
          : nothing}
        <div class="task-detail-grid">
          <div class="task-detail-field">
            <span class="task-detail-label">Status</span>
            <span class="badge badge-${task.state}">${task.state}</span>
          </div>
          <div class="task-detail-field">
            <span class="task-detail-label">Assignee</span>
            <span>${task.assignee ? `@${task.assignee}` : "Unassigned"}</span>
          </div>
          <div class="task-detail-field">
            <span class="task-detail-label">Created</span>
            <span>${task.created ? new Date(task.created).toLocaleString() : "—"}</span>
          </div>
          <div class="task-detail-field">
            <span class="task-detail-label">Updated</span>
            <span>${task.updated ? new Date(task.updated).toLocaleString() : "—"}</span>
          </div>
          ${task.completed
            ? html`
                <div class="task-detail-field">
                  <span class="task-detail-label">Completed</span>
                  <span>${new Date(task.completed).toLocaleString()}</span>
                </div>
              `
            : nothing}
          ${task.reviewType
            ? html`
                <div class="task-detail-field">
                  <span class="task-detail-label">Review Type</span>
                  <span>${task.reviewType}</span>
                </div>
              `
            : nothing}
        </div>
        ${task.labels && task.labels.length > 0
          ? html`
              <div class="task-detail-labels">
                ${task.labels.map((l) => html`<span class="badge badge-label">${l}</span>`)}
              </div>
            `
          : nothing}
      </div>
    </div>
  `;
}

function renderCommit(
  commit: GitCommit,
  onCommitClick: (hash: string) => void,
) {
  return html`
    <button class="git-commit" @click=${() => onCommitClick(commit.hash)} aria-label="View commit ${commit.hash.slice(0, 7)}">
      <div class="git-commit-header">
        <code class="git-hash">${commit.hash.slice(0, 7)}</code>
        <span class="git-author">@${commit.author}</span>
        <span class="git-time">${formatRelativeTimestamp(new Date(commit.timestamp).getTime())}</span>
      </div>
      <p class="git-message">${commit.message}</p>
      <span class="git-files">${commit.filesChanged} file${commit.filesChanged !== 1 ? "s" : ""} changed</span>
    </button>
  `;
}

function renderCommitDiffModal(
  hash: string | null,
  diff: string | null,
  loading: boolean,
  onClose: () => void,
) {
  if (!hash) return nothing;

  return html`
    <div class="modal-overlay" @click=${onClose} role="dialog" aria-modal="true" aria-label="Commit diff">
      <div class="modal-content commit-diff-modal" @click=${(e: Event) => e.stopPropagation()}>
        <header class="modal-header">
          <code class="git-hash">${hash.slice(0, 7)}</code>
          <button class="btn btn-sm modal-close" @click=${onClose} aria-label="Close">✕</button>
        </header>
        ${loading
          ? html`<p class="modal-loading">Loading diff…</p>`
          : html`<pre class="commit-diff-content">${diff || "No diff available"}</pre>`}
      </div>
    </div>
  `;
}

function renderGitFeed(
  commits: GitCommit[],
  commitDetailHash: string | null,
  commitDiff: string | null,
  commitDiffLoading: boolean,
  onCommitClick: (hash: string | null) => void,
) {
  if (commits.length === 0) {
    return html`
      <section class="board-section git-feed" aria-labelledby="git-heading">
        <h2 id="git-heading">Git Activity</h2>
        <p class="board-empty">⚠️ No git history available for this project</p>
      </section>
    `;
  }

  const groups = groupCommitsByDate(commits);

  return html`
    <section class="board-section git-feed" aria-labelledby="git-heading">
      <h2 id="git-heading">Git Activity</h2>
      ${groups.map(
        (g) => html`
          <div class="git-group">
            <h3 class="git-group-label">${g.label}</h3>
            ${g.commits.map((c) => renderCommit(c, (h) => onCommitClick(h)))}
          </div>
        `,
      )}
      ${renderCommitDiffModal(commitDetailHash, commitDiff, commitDiffLoading, () =>
        onCommitClick(null),
      )}
    </section>
  `;
}

export function renderProjectBoard(props: ProjectBoardProps) {
  const { data, projectId, onBack, onMoveTask, onTaskDetail, onCommitClick, onToggleShowAllDone, onRefresh, chatOpen, onOpenChat } = props;

  if (data.loading && !data.board) {
    return html`<div class="home-loading" role="status" aria-live="polite">Loading project board…</div>`;
  }

  if (data.error) {
    return html`
      <div class="home-error" role="alert">
        <p>Error: ${data.error}</p>
        <button class="btn" @click=${onRefresh}>Retry</button>
      </div>
    `;
  }

  const project = data.project;
  const tasks = data.board?.tasks || [];
  const grouped = groupTasksByColumn(tasks, data.showAllDone);
  const allDoneCount = tasks.filter(
    (t) => t.state === "done" || t.state === "completed",
  ).length;

  const detailTask = data.taskDetailId
    ? tasks.find((t) => t.id === data.taskDetailId)
    : undefined;

  return html`
    <div class="project-board-layout ${chatOpen ? "project-board-layout--chat-open" : ""}">
      <div class="project-board-main">
        <!-- Project Header -->
        <header class="project-header">
          <div class="project-header-left">
            <button class="btn btn-sm" @click=${onBack} aria-label="Back to home">← Back</button>
            <div class="project-header-info">
              <h1 class="project-name">${project?.name || projectId}</h1>
              ${project?.description
                ? html`<p class="project-desc">${project.description}</p>`
                : nothing}
            </div>
          </div>
          <div class="project-header-meta">
            ${project?.priority
              ? html`<span class="badge badge-priority-${project.priority}">${project.priority}</span>`
              : nothing}
            ${(project as any)?.lead
              ? html`<span class="project-lead">Lead: @${(project as any).lead}</span>`
              : nothing}
            ${data.board?.lastUpdated
              ? html`<span class="project-updated">Updated ${formatRelativeTimestamp(new Date(data.board.lastUpdated).getTime())}</span>`
              : nothing}
            <button class="btn btn-sm" @click=${onRefresh} aria-label="Refresh">↻</button>
            <button class="btn btn-sm btn-chat-toggle" @click=${onOpenChat}>
              💬 ${chatOpen ? "Close Chat" : "Project Chat"}
            </button>
          </div>
        </header>

        <!-- Kanban Board -->
        <section class="board-kanban" aria-label="Task board">
          ${COLUMNS.map((col) =>
            renderColumn(
              col.key,
              col.label,
              grouped[col.key],
              col.key === "done" ? allDoneCount : 0,
              data.showAllDone,
              (id) => onTaskDetail(id),
              onMoveTask,
              onToggleShowAllDone,
            ),
          )}
        </section>

        <!-- Git Activity Feed -->
        ${renderGitFeed(
          data.commits,
          data.commitDetailHash,
          data.commitDiff,
          data.commitDiffLoading,
          onCommitClick,
        )}

        <!-- Task Detail Modal -->
        ${renderTaskDetailModal(detailTask, () => onTaskDetail(null))}
      </div>

      ${chatOpen
        ? html`
            <aside class="project-chat-sidebar">
              <div class="home-chat-placeholder">
                <p>💬 Project: ${project?.name || projectId}</p>
                <p class="home-chat-hint">
                  Session: <code>agent:main:project:${projectId}</code>
                </p>
                <p class="home-chat-hint">Chat panel integration coming soon</p>
              </div>
            </aside>
          `
        : nothing}
    </div>
  `;
}
