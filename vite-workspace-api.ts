/**
 * Vite plugin that serves OpenClaw workspace data as API endpoints.
 * In production, these would be served by the Gateway or a dedicated API.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/openclaw/.openclaw/workspace";

export function workspaceApiPlugin(): Plugin {
  return {
    name: "workspace-api",
    configureServer(server) {
      server.middlewares.use("/api/projects", (_req, res) => {
        try {
          const data = fs.readFileSync(path.join(WORKSPACE, "state/projects.json"), "utf-8");
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(data);
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ projects: [], archived: [] }));
        }
      });

      server.middlewares.use("/api/board/", (req, res, next) => {
        // POST /api/board/<projectId>/move — move task
        if (req.method === "POST") {
          const urlPath = req.url?.replace(/^\//, "").replace(/\/$/, "") || "";
          const match = urlPath.match(/^(.+)\/move$/);
          if (!match) { next(); return; }
          const projectId = match[1];
          if (projectId.includes("..")) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid project ID" }));
            return;
          }
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", () => {
            try {
              const { taskId, newState } = JSON.parse(body);
              const boardPath = path.join(WORKSPACE, `projects/${projectId}/board.json`);
              const boardData = JSON.parse(fs.readFileSync(boardPath, "utf-8"));
              const task = boardData.tasks?.find((t: any) => t.id === taskId);
              if (task) {
                task.state = newState;
                task.updated = new Date().toISOString();
                if (newState === "done") {
                  task.completed = task.completed || new Date().toISOString();
                }
                boardData.lastUpdated = new Date().toISOString();
                fs.writeFileSync(boardPath, JSON.stringify(boardData, null, 2));
              }
              res.setHeader("Content-Type", "application/json");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end(JSON.stringify(boardData));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        // GET /api/board/<projectId> — read board
        const projectId = req.url?.replace(/^\//, "").replace(/\/$/, "") || "";
        if (!projectId || projectId.includes("..")) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid project ID" }));
          return;
        }
        try {
          const data = fs.readFileSync(
            path.join(WORKSPACE, `projects/${projectId}/board.json`),
            "utf-8",
          );
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(data);
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ tasks: [] }));
        }
      });

      // Git log endpoint
      server.middlewares.use("/api/git-log/", (req: IncomingMessage, res: ServerResponse) => {
        const projectId = req.url?.replace(/^\//, "").replace(/\/$/, "") || "";
        if (!projectId || projectId.includes("..")) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid project ID" }));
          return;
        }
        const projectDir = path.join(WORKSPACE, `projects/${projectId}`);
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        try {
          const SEP = "|||";
          const gitOutput = execSync(
            `git log --format="%H${SEP}%an${SEP}%aI${SEP}%s" -20 -- "${projectDir}"`,
            { cwd: WORKSPACE, encoding: "utf-8", timeout: 5000 },
          );
          const commits = gitOutput
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              try {
                const [hash, author, timestamp, ...msgParts] = line.split(SEP);
                const message = msgParts.join(SEP);
                let filesChanged = 0;
                try {
                  const files = execSync(
                    `git diff-tree --no-commit-id --name-only -r ${hash} -- "${projectDir}"`,
                    { cwd: WORKSPACE, encoding: "utf-8", timeout: 3000 },
                  );
                  filesChanged = files.trim().split("\n").filter(Boolean).length;
                } catch { /* ignore */ }
                return { hash, author, timestamp, message, filesChanged };
              } catch {
                return null;
              }
            })
            .filter(Boolean);
          res.end(JSON.stringify({ commits }));
        } catch (err) {
          res.end(JSON.stringify({ commits: [], warning: "No git history available" }));
        }
      });

      // Git diff endpoint
      server.middlewares.use("/api/git-diff/", (req: IncomingMessage, res: ServerResponse) => {
        const parts = (req.url?.replace(/^\//, "") || "").split("/");
        const projectId = parts[0];
        const hash = parts[1];
        if (!projectId || !hash || projectId.includes("..") || !/^[a-f0-9]+$/i.test(hash)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid parameters" }));
          return;
        }
        try {
          const diff = execSync(`git show --stat --patch ${hash}`, {
            cwd: WORKSPACE,
            encoding: "utf-8",
            timeout: 5000,
          });
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify({ diff }));
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ diff: "Diff not available" }));
        }
      });

      server.middlewares.use("/api/standup", (_req, res) => {
        try {
          const data = fs.readFileSync(path.join(WORKSPACE, "standup-latest.md"), "utf-8");
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify({ content: data }));
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ content: "" }));
        }
      });
    },
  };
}
