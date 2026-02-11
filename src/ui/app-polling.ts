import type { OpenClawApp } from "./app.ts";
import { loadDebug } from "./controllers/debug.ts";
import { loadHomeData } from "./controllers/home-data.ts";
import { loadProjectBoard } from "./controllers/project-board.ts";
import { loadLogs } from "./controllers/logs.ts";
import { loadNodes } from "./controllers/nodes.ts";

type PollingHost = {
  nodesPollInterval: number | null;
  logsPollInterval: number | null;
  debugPollInterval: number | null;
  homePollInterval: number | null;
  projectBoardPollInterval: number | null;
  tab: string;
  activeProjectId: string | null;
};

export function startNodesPolling(host: PollingHost) {
  if (host.nodesPollInterval != null) {
    return;
  }
  host.nodesPollInterval = window.setInterval(
    () => void loadNodes(host as unknown as OpenClawApp, { quiet: true }),
    5000,
  );
}

export function stopNodesPolling(host: PollingHost) {
  if (host.nodesPollInterval == null) {
    return;
  }
  clearInterval(host.nodesPollInterval);
  host.nodesPollInterval = null;
}

export function startLogsPolling(host: PollingHost) {
  if (host.logsPollInterval != null) {
    return;
  }
  host.logsPollInterval = window.setInterval(() => {
    if (host.tab !== "logs") {
      return;
    }
    void loadLogs(host as unknown as OpenClawApp, { quiet: true });
  }, 2000);
}

export function stopLogsPolling(host: PollingHost) {
  if (host.logsPollInterval == null) {
    return;
  }
  clearInterval(host.logsPollInterval);
  host.logsPollInterval = null;
}

export function startDebugPolling(host: PollingHost) {
  if (host.debugPollInterval != null) {
    return;
  }
  host.debugPollInterval = window.setInterval(() => {
    if (host.tab !== "debug") {
      return;
    }
    void loadDebug(host as unknown as OpenClawApp);
  }, 3000);
}

export function stopDebugPolling(host: PollingHost) {
  if (host.debugPollInterval == null) {
    return;
  }
  clearInterval(host.debugPollInterval);
  host.debugPollInterval = null;
}

export function startHomePolling(host: PollingHost) {
  if (host.homePollInterval != null) {
    return;
  }
  // Initial load
  void loadHomeData(host as unknown as OpenClawApp);
  host.homePollInterval = window.setInterval(() => {
    if (host.tab !== "home") {
      return;
    }
    void loadHomeData(host as unknown as OpenClawApp);
  }, 30000);
}

export function stopHomePolling(host: PollingHost) {
  if (host.homePollInterval == null) {
    return;
  }
  clearInterval(host.homePollInterval);
  host.homePollInterval = null;
}

export function startProjectBoardPolling(host: PollingHost) {
  if (host.projectBoardPollInterval != null) {
    return;
  }
  host.projectBoardPollInterval = window.setInterval(() => {
    if (host.tab !== "home" || !host.activeProjectId) {
      return;
    }
    void loadProjectBoard(host as unknown as OpenClawApp, host.activeProjectId);
  }, 30000);
}

export function stopProjectBoardPolling(host: PollingHost) {
  if (host.projectBoardPollInterval == null) {
    return;
  }
  clearInterval(host.projectBoardPollInterval);
  host.projectBoardPollInterval = null;
}
