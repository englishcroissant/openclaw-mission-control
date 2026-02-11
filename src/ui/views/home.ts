import { html, nothing } from "lit";
import type { HomeData, ProjectCard, ReviewItem } from "../controllers/home-data.ts";
import { formatRelativeTimestamp } from "../format.ts";

export type HomeProps = {
  homeData: HomeData;
  onRefresh: () => void;
  onProjectClick: (projectId: string) => void;
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

function renderReviewItem(item: ReviewItem) {
  return html`
    <tr>
      <td><code class="review-task-id">${item.taskId}</code></td>
      <td>${item.title}</td>
      <td>${item.projectName}</td>
      <td>@${item.assignee}</td>
      <td><span class="badge badge-priority-${item.priority}">${item.priority.toUpperCase()}</span></td>
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
  const { homeData, onRefresh, onProjectClick } = props;

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
    <div class="home-dashboard">
      <!-- Project Grid -->
      <section class="home-section" aria-labelledby="projects-heading">
        <div class="home-section-header">
          <h2 id="projects-heading">Projects</h2>
          <button class="btn btn-sm" @click=${onRefresh} aria-label="Refresh dashboard">↻ Refresh</button>
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
                    </tr>
                  </thead>
                  <tbody>
                    ${homeData.reviewQueue.map(renderReviewItem)}
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
  `;
}
