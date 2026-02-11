/**
 * Project Board data controller.
 * Fetches board tasks, git commits, and project metadata.
 */

import type { BoardData, BoardTask, ProjectInfo } from "./home-data.ts";

export interface GitCommit {
  hash: string;
  author: string;
  timestamp: string;
  message: string;
  filesChanged: number;
}

export interface ProjectBoardData {
  project: ProjectInfo | null;
  board: BoardData | null;
  commits: GitCommit[];
  loading: boolean;
  error: string | null;
  taskDetailId: string | null;
  commitDetailHash: string | null;
  commitDiff: string | null;
  commitDiffLoading: boolean;
  showAllDone: boolean;
  showAllBacklog: boolean;
}

export type ProjectBoardState = {
  projectBoard: ProjectBoardData;
};

const API_BASE = "";

export function defaultProjectBoard(): ProjectBoardData {
  return {
    project: null,
    board: null,
    commits: [],
    loading: false,
    error: null,
    taskDetailId: null,
    commitDetailHash: null,
    commitDiff: null,
    commitDiffLoading: false,
    showAllDone: false,
    showAllBacklog: false,
  };
}

export async function loadProjectBoard(
  state: ProjectBoardState,
  projectId: string,
): Promise<void> {
  state.projectBoard = { ...state.projectBoard, loading: true, error: null };

  try {
    const [projRes, boardRes, commitsRes] = await Promise.all([
      fetch(`${API_BASE}/api/projects`),
      fetch(`${API_BASE}/api/board/${projectId}`),
      fetch(`${API_BASE}/api/git-log/${projectId}`),
    ]);

    const projData = (await projRes.json()) as { projects: ProjectInfo[] };
    const project = (projData.projects || []).find((p) => p.id === projectId) || null;
    const board = (await boardRes.json()) as BoardData;

    let commits: GitCommit[] = [];
    if (commitsRes.ok) {
      const commitsData = (await commitsRes.json()) as { commits: GitCommit[] };
      commits = commitsData.commits || [];
    }

    state.projectBoard = {
      ...state.projectBoard,
      project,
      board,
      commits,
      loading: false,
      error: null,
    };
  } catch (err) {
    state.projectBoard = {
      ...state.projectBoard,
      loading: false,
      error: String(err),
    };
  }
}

export async function moveTask(
  state: ProjectBoardState,
  projectId: string,
  taskId: string,
  newState: string,
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/board/${projectId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, newState }),
    });
    if (res.ok) {
      const board = (await res.json()) as BoardData;
      state.projectBoard = { ...state.projectBoard, board };
    }
  } catch (err) {
    console.error("Failed to move task:", err);
  }
}

export async function loadCommitDiff(
  state: ProjectBoardState,
  projectId: string,
  hash: string,
): Promise<void> {
  state.projectBoard = {
    ...state.projectBoard,
    commitDetailHash: hash,
    commitDiff: null,
    commitDiffLoading: true,
  };
  try {
    const res = await fetch(`${API_BASE}/api/git-diff/${projectId}/${hash}`);
    if (res.ok) {
      const data = (await res.json()) as { diff: string };
      state.projectBoard = {
        ...state.projectBoard,
        commitDiff: data.diff || "No diff available",
        commitDiffLoading: false,
      };
    } else {
      state.projectBoard = {
        ...state.projectBoard,
        commitDiff: "Failed to load diff",
        commitDiffLoading: false,
      };
    }
  } catch {
    state.projectBoard = {
      ...state.projectBoard,
      commitDiff: "Failed to load diff",
      commitDiffLoading: false,
    };
  }
}

// Column definitions
export const COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "planned", label: "Planned" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
] as const;

export type ColumnKey = (typeof COLUMNS)[number]["key"];

function priorityOrder(p: string): number {
  switch (p?.toLowerCase()) {
    case "p0": return 0;
    case "p1": return 1;
    case "p2": return 2;
    case "p3": return 3;
    default: return 9;
  }
}

/**
 * Group and sort tasks by column.
 * Done column: only last 7 days unless showAll.
 */
export function groupTasksByColumn(
  tasks: BoardTask[],
  showAllDone: boolean,
  showAllBacklog: boolean = false,
): Record<ColumnKey, BoardTask[]> {
  const groups: Record<ColumnKey, BoardTask[]> = {
    backlog: [],
    planned: [],
    "in-progress": [],
    review: [],
    done: [],
  };

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const task of tasks) {
    // Map task states to columns
    let col: ColumnKey;
    if (task.state === "done" || task.state === "completed") {
      col = "done";
    } else if (task.state === "in-progress" || task.state === "active") {
      col = "in-progress";
    } else if (task.state === "review" || task.state === "in-review") {
      col = "review";
    } else if (task.state === "planned") {
      col = "planned";
    } else {
      col = "backlog";
    }

    // Filter done tasks to last 7 days unless showAll
    if (col === "done" && !showAllDone) {
      const completedDate = task.completed || task.updated || task.created || "";
      if (completedDate && new Date(completedDate).getTime() < sevenDaysAgo) {
        continue;
      }
    }

    groups[col].push(task);
  }

  // Sort each column: priority first, then created date
  for (const col of Object.keys(groups) as ColumnKey[]) {
    groups[col].sort((a, b) => {
      const pd = priorityOrder(a.priority || "") - priorityOrder(b.priority || "");
      if (pd !== 0) return pd;
      return (a.created || "").localeCompare(b.created || "");
    });
  }

  // Truncate backlog to 10 items unless showAll
  if (!showAllBacklog && groups.backlog.length > 10) {
    groups.backlog = groups.backlog.slice(0, 10);
  }

  return groups;
}

/**
 * Group commits by date (Today, Yesterday, This Week, Older)
 */
export function groupCommitsByDate(
  commits: GitCommit[],
): { label: string; commits: GitCommit[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, GitCommit[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  for (const commit of commits) {
    const d = new Date(commit.timestamp);
    if (d >= today) {
      groups["Today"].push(commit);
    } else if (d >= yesterday) {
      groups["Yesterday"].push(commit);
    } else if (d >= weekAgo) {
      groups["This Week"].push(commit);
    } else {
      groups["Older"].push(commit);
    }
  }

  return Object.entries(groups)
    .filter(([, commits]) => commits.length > 0)
    .map(([label, commits]) => ({ label, commits }));
}
