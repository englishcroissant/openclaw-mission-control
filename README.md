# OpenClaw Mission Control

Agent management dashboard forked from the [OpenClaw Gateway UI](https://github.com/openclaw/openclaw/tree/main/ui).

## Purpose

Mission Control is a standalone frontend for managing multi-agent workflows, providing:
- Agent monitoring and status dashboards
- Project-scoped chat sessions
- Cost/usage tracking
- Session management

## Tech Stack

- **Framework:** Lit v3.3.2 (Web Components)
- **Build:** Vite 7.3.1
- **Language:** TypeScript
- **State:** Lit `@state()` properties (no external state library)
- **Routing:** Custom tab-based with `history.pushState`

## Home Page (Mission Control Dashboard)

The default landing page (`/` or `/home`) shows:

1. **Project Grid** — Cards for each project showing tasks in progress, tasks needing review, and last update time. Data from `workspace/state/projects.json` + `workspace/projects/*/board.json`.
2. **Review Queue** — Tasks with `reviewType: "sam-required"` across all projects, sorted by priority.
3. **Standup Summary** — Parsed from `workspace/standup-latest.md` showing completed, in-progress, and attention-needed items.

Data auto-refreshes every 30 seconds. The Vite dev server includes a plugin that serves workspace files as API endpoints (`/api/projects`, `/api/board/:projectId`, `/api/standup`).

### Testing the Home Page

```bash
# Set workspace path (defaults to /home/openclaw/.openclaw/workspace)
export OPENCLAW_WORKSPACE=/path/to/workspace

# Start dev server
npm run dev

# Open http://localhost:5173 — you'll land on the Home page
```

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Project Structure

```
src/
├── main.ts                 # Entry point
├── styles/                 # Global CSS
├── shared/                 # Vendored dependencies from openclaw core
│   ├── gateway/            # Device auth, client info
│   ├── sessions/           # Session key utilities
│   ├── infra/              # Time formatting
│   └── agents/             # Tool policy types
└── ui/
    ├── app.ts              # Main LitElement component
    ├── gateway.ts          # WebSocket client (JSON-RPC)
    ├── views/              # Tab view render functions
    ├── controllers/        # Data fetching (RPC calls)
    ├── chat/               # Chat rendering internals
    └── components/         # Reusable web components
```

## Architecture

See [Gateway UI Architecture Brief](docs/gateway-ui-architecture.md) for detailed technical analysis of the codebase, extension points, and restructuring recommendations.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENCLAW_CONTROL_UI_BASE_PATH` | Base path for the app | `./` |
| `OPENCLAW_WORKSPACE` | Path to OpenClaw workspace directory | `/home/openclaw/.openclaw/workspace` |

## Origin

Extracted from `openclaw/openclaw` `/ui` directory. External imports from the gateway server codebase have been vendored into `src/shared/`.
