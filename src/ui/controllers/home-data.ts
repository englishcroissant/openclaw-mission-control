/**
 * Home page data controller.
 * Fetches projects, boards, and standup data from the workspace API.
 */

export interface ProjectInfo {
  id: string;
  name: string;
  status: string;
  description?: string;
  priority?: string;
  created?: string;
}

export interface TaskComment {
  id: string;
  author: string;
  authorType: "human" | "agent";
  content: string;
  timestamp: string;
}

export interface TaskReviewNotes {
  content: string;
  updatedBy: string;
  updatedAt: string;
}

export interface BoardTask {
  id: string;
  title: string;
  state: string;
  assignee?: string;
  priority?: string;
  created?: string;
  updated?: string;
  completed?: string;
  reviewType?: string;
  labels?: string[];
  description?: string;
  comments?: TaskComment[];
  reviewNotes?: TaskReviewNotes;
}

export interface BoardData {
  projectId: string;
  lastUpdated?: string;
  tasks: BoardTask[];
}

export interface ProjectCard {
  project: ProjectInfo;
  board: BoardData | null;
  tasksInProgress: number;
  tasksNeedingReview: number;
  lastUpdate: string | null;
}

export interface ReviewItem {
  taskId: string;
  title: string;
  projectName: string;
  projectId: string;
  assignee: string;
  priority: string;
  updated: string;
  reviewNotes?: string;
}

export interface HomeData {
  projects: ProjectCard[];
  reviewQueue: ReviewItem[];
  standupContent: string;
  loading: boolean;
  error: string | null;
}

export type HomeDataState = {
  homeData: HomeData;
};

const API_BASE = "";

function priorityOrder(p: string): number {
  switch (p?.toLowerCase()) {
    case "p0":
      return 0;
    case "p1":
      return 1;
    case "p2":
      return 2;
    case "p3":
      return 3;
    default:
      return 9;
  }
}

export function defaultHomeData(): HomeData {
  return {
    projects: [],
    reviewQueue: [],
    standupContent: "",
    loading: false,
    error: null,
  };
}

export async function loadHomeData(state: HomeDataState): Promise<void> {
  state.homeData = { ...state.homeData, loading: true, error: null };

  try {
    // Fetch projects
    const projRes = await fetch(`${API_BASE}/api/projects`);
    const projData = (await projRes.json()) as { projects: ProjectInfo[]; archived: unknown[] };
    const projects = projData.projects || [];

    // Fetch boards for all projects in parallel
    const boardResults = await Promise.allSettled(
      projects.map(async (p) => {
        const res = await fetch(`${API_BASE}/api/board/${p.id}`);
        return (await res.json()) as BoardData;
      }),
    );

    const projectCards: ProjectCard[] = [];
    const reviewQueue: ReviewItem[] = [];

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const boardResult = boardResults[i];
      const board =
        boardResult.status === "fulfilled" ? boardResult.value : null;

      const tasks = board?.tasks || [];
      const inProgress = tasks.filter((t) => t.state === "in-progress" || t.state === "active").length;
      const needsReview = tasks.filter(
        (t) => (t.state === "review" || t.state === "in-review") || (t.reviewType === "sam-required" && t.state !== "done"),
      ).length;

      // Collect review items - tasks in review state OR requiring sam review
      for (const task of tasks) {
        if ((task.state === "review" || task.state === "in-review") || (task.reviewType === "sam-required" && task.state !== "done")) {
          reviewQueue.push({
            taskId: task.id,
            title: task.title,
            projectName: project.name,
            projectId: project.id,
            assignee: task.assignee || "unassigned",
            priority: task.priority || "p3",
            updated: task.updated || task.created || "",
            reviewNotes: task.reviewNotes?.content,
          });
        }
      }

      projectCards.push({
        project,
        board,
        tasksInProgress: inProgress,
        tasksNeedingReview: needsReview,
        lastUpdate: board?.lastUpdated || null,
      });
    }

    // Sort review queue by priority then recency
    reviewQueue.sort((a, b) => {
      const pd = priorityOrder(a.priority) - priorityOrder(b.priority);
      if (pd !== 0) return pd;
      return (b.updated || "").localeCompare(a.updated || "");
    });

    // Fetch standup
    let standupContent = "";
    try {
      const standupRes = await fetch(`${API_BASE}/api/standup`);
      const standupData = (await standupRes.json()) as { content: string };
      standupContent = standupData.content || "";
    } catch {
      // Non-critical
    }

    state.homeData = {
      projects: projectCards,
      reviewQueue,
      standupContent,
      loading: false,
      error: null,
    };
  } catch (err) {
    state.homeData = {
      ...state.homeData,
      loading: false,
      error: String(err),
    };
  }
}
