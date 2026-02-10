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

## Origin

Extracted from `openclaw/openclaw` `/ui` directory. External imports from the gateway server codebase have been vendored into `src/shared/`.
