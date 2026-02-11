/**
 * Vite plugin that serves OpenClaw workspace data as API endpoints.
 * In production, these would be served by the Gateway or a dedicated API.
 */
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

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

      server.middlewares.use("/api/board/", (req, res) => {
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
