import { html, nothing } from "lit";
import type { HomeData, ProjectCard, ReviewItem } from "../controllers/home-data.ts";
import { formatRelativeTimestamp } from "../format.ts";

export type HomeProps = {
  homeData: HomeData;
  onRefresh: () => void;
  onProjectClick: (projectId: string) => void;
  onReviewTaskClick: (projectId: string, taskId: string) => void;
  onOpenChat: () => void;
  chatOpen: boolean;
};

function renderProjectCard(card: ProjectCard, onProjectClick: (id: string) => void) {
  const { project, tasksInProgress, tasksNeedingReview, lastUpdate } = card;
  const priorityClass = project.priority === "critical" ? "priority-critical" : "";

  return html`
    <button
      class="home-project-card ${priorityClass}"
      @click=${() => onProjectClick(project.id)}
      aria-label="View project: ${project.name}"
    >
      <div class="project-card-header">
        <h3 class="project-card-name">${project.name}</h3>
        <span class="project-card-status badge badge-${project.status}">${project.status}</span>
      </div>
      ${project.description
        ? html`<p class="project-card-desc">${project.description}</p>`
        : nothing}
      <div class="project-card-stats">
        <div class="stat">
          <span class="stat-value">${tasksInProgress}</span>
          <span class="stat-label">In Progress</span>
        </div>
        <div class="stat">
          <span class="stat-value ${tasksNeedingReview > 0 ? "stat-attention" : ""}">${tasksNeedingReview}</span>
          <span class="stat-label">Need Review</span>
        </div>
      </div>
      ${lastUpdate
        ? html`<div class="project-card-updated">Updated ${formatRelativeTimestamp(new Date(lastUpdate).getTime())}</div>`
        : nothing}
    </button>
  `;
}

function renderReviewItem(item: ReviewItem, onReviewTaskClick: (projectId: string, taskId: string) => void) {
  return html`
    <tr
      class="review-row-clickable"
      @click=${() => onReviewTaskClick(item.projectId, item.taskId)}
      role="button"
      tabindex="0"
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onReviewTaskClick(item.projectId, item.taskId);
        }
      }}
      aria-label="View task ${item.taskId}: ${item.title} in ${item.projectName}"
    >
      <td><code class="review-task-id">${item.taskId}</code></td>
      <td>${item.title}</td>
      <td>${item.projectName}</td>
      <td>@${item.assignee}</td>
      <td><span class="badge badge-priority-${item.priority}">${item.priority.toUpperCase()}</span></td>
      <td class="review-notes-cell">${item.reviewNotes
        ? html`<span class="review-notes-truncated" title="${item.reviewNotes}">${item.reviewNotes.length > 100 ? item.reviewNotes.slice(0, 100) + "…" : item.reviewNotes}</span>`
        : html`<span class="review-notes-empty">—</span>`}</td>
    </tr>
  `;
}

function parseStandup(content: string): {
  completed: string[];
  inProgress: string[];
  needsAttention: string[];
} {
  const completed: string[] = [];
  const inProgress: string[] = [];
  const needsAttention: string[] = [];

  let currentSection = "";
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.includes("Completed") || trimmed.includes("✅")) {
      currentSection = "completed";
    } else if (trimmed.includes("In Progress") || trimmed.includes("🔨")) {
      currentSection = "inProgress";
    } else if (trimmed.includes("Needs Attention") || trimmed.includes("🚨")) {
      currentSection = "needsAttention";
    } else if (trimmed.startsWith("- **") || trimmed.startsWith("- ")) {
      const text = trimmed.replace(/^- /, "").replace(/\*\*/g, "");
      if (currentSection === "completed") completed.push(text);
      else if (currentSection === "inProgress") inProgress.push(text);
      else if (currentSection === "needsAttention") needsAttention.push(text);
    }
  }

  return { completed, inProgress, needsAttention };
}

export function renderHome(props: HomeProps) {
  const { homeData, onRefresh, onProjectClick, onReviewTaskClick, onOpenChat, chatOpen } = props;

  if (homeData.loading && homeData.projects.length === 0) {
    return html`<div class="home-loading" role="status" aria-live="polite">Loading dashboard…</div>`;
  }

  if (homeData.error) {
    return html`
      <div class="home-error" role="alert">
        <p>Error loading dashboard: ${homeData.error}</p>
        <button class="btn" @click=${onRefresh}>Retry</button>
      </div>
    `;
  }

  const standup = parseStandup(homeData.standupContent);

  return html`
    <div class="home-layout ${chatOpen ? "home-layout--chat-open" : ""}">
      <div class="home-dashboard">
        <!-- Project Grid -->
        <section class="home-section" aria-labelledby="projects-heading">
          <div class="home-section-header">
            <h2 id="projects-heading">Projects</h2>
            <div class="home-section-actions">
              <button class="btn btn-sm" @click=${onRefresh} aria-label="Refresh dashboard">↻ Refresh</button>
              <button class="btn btn-sm btn-chat-toggle" @click=${onOpenChat} aria-label="${chatOpen ? "Close" : "Open"} CEO Office chat">
                💬 ${chatOpen ? "Close Chat" : "CEO Office"}
              </button>
            </div>
          </div>
        ${homeData.projects.length === 0
          ? html`<p class="home-empty">No active projects</p>`
          : html`
              <div class="home-project-grid" role="list">
                ${homeData.projects.map((card) =>
                  renderProjectCard(card, onProjectClick),
                )}
              </div>
            `}
      </section>

      <!-- Review Queue -->
      <section class="home-section" aria-labelledby="review-heading">
        <h2 id="review-heading">Review Queue</h2>
        ${homeData.reviewQueue.length === 0
          ? html`<p class="home-empty">No tasks awaiting review</p>`
          : html`
              <div class="home-table-wrapper" role="region" aria-label="Review queue table" tabindex="0">
                <table class="home-review-table">
                  <thead>
                    <tr>
                      <th scope="col">Task ID</th>
                      <th scope="col">Title</th>
                      <th scope="col">Project</th>
                      <th scope="col">Assignee</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${homeData.reviewQueue.map((item) => renderReviewItem(item, onReviewTaskClick))}
                  </tbody>
                </table>
              </div>
            `}
      </section>

      <!-- Standup Summary -->
      <section class="home-section" aria-labelledby="standup-heading">
        <h2 id="standup-heading">Today's Standup</h2>
        ${!homeData.standupContent
          ? html`<p class="home-empty">No standup data available</p>`
          : html`
              <div class="home-standup">
                ${standup.needsAttention.length > 0
                  ? html`
                      <div class="standup-group standup-attention">
                        <h3>🚨 Needs Attention</h3>
                        <ul>
                          ${standup.needsAttention.map((item) => html`<li>${item}</li>`)}
                        </ul>
                      </div>
                    `
                  : nothing}
                ${standup.inProgress.length > 0
                  ? html`
                      <div class="standup-group standup-progress">
                        <h3>🔨 In Progress</h3>
                        <ul>
                          ${standup.inProgress.map((item) => html`<li>${item}</li>`)}
                        </ul>
                      </div>
                    `
                  : nothing}
                ${standup.completed.length > 0
                  ? html`
                      <div class="standup-group standup-done">
                        <h3>✅ Completed This Week</h3>
                        <ul>
                          ${standup.completed.map((item) => html`<li>${item}</li>`)}
                        </ul>
                      </div>
                    `
                  : nothing}
              </div>
            `}
        </section>
      </div>
      ${chatOpen
        ? html`
            <aside class="home-chat-sidebar" aria-label="CEO Office Chat">
              <div class="home-chat-placeholder">
                <p>💬 Chat with CEO Office</p>
                <p class="home-chat-hint">Session: <code>agent:main:main</code></p>
                <button class="btn" @click=${onOpenChat}>Switch to Chat Tab →</button>
              </div>
            </aside>
          `
        : nothing}
    </div>
  `;
}
