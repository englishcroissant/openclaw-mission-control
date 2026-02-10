# Gateway UI Architecture Technical Brief

**Source:** https://github.com/openclaw/openclaw/tree/main/ui
**Reviewed:** 2026-02-10
**Purpose:** Inform Mission Control dashboard fork/extension

---

## Architecture Overview

### Framework: Lit (Web Components)

The Gateway UI is built with **Lit v3.3.2** — a lightweight Web Components library. There is **no React, no Vue**. The entire app is a single custom element `<openclaw-app>` defined in `app.ts`.

**Key implications for Mission Control:**
- No virtual DOM, no JSX — uses `html` tagged template literals
- No component tree in the React sense — it's one monolithic LitElement with ~100+ `@state()` properties
- Rendering is a single `renderApp()` function that switches on `state.tab`
- CSS is global (plain `.css` files), not scoped to components

### State Management: Flat @state() Properties

There is **no Redux, no MobX, no stores**. All state lives as `@state()` decorated properties on the `OpenClawApp` class. When any property changes, Lit re-renders.

The app passes itself (or a subset) as an `AppViewState` to render functions and controller functions. Controllers mutate state directly on the app instance.

### Routing: Custom Tab-Based (No Router Library)

Routing is handled by `navigation.ts` with a simple `Tab` union type:

```typescript
type Tab = "agents" | "overview" | "channels" | "instances" | "sessions"
         | "usage" | "cron" | "skills" | "nodes" | "chat" | "config"
         | "debug" | "logs";
```

Tabs are organized into groups:
- **Chat:** chat
- **Control:** overview, channels, instances, sessions, usage, cron
- **Agent:** agents, skills, nodes
- **Settings:** config, debug, logs

URL paths map 1:1 to tabs (e.g., `/chat`, `/agents`, `/config`). Uses `history.pushState` — no hash routing. Supports a configurable base path via `window.__OPENCLAW_CONTROL_UI_BASE_PATH__`.

### Build Tooling: Vite 7.3.1

- **Build:** `vite build` → outputs to `../dist/control-ui`
- **Dev:** `vite` on port 5173
- **Test:** `vitest` with Playwright browser tests
- **Base path:** Configurable via `OPENCLAW_CONTROL_UI_BASE_PATH` env var (defaults to `./`)
- **No TypeScript compilation step** — Vite handles TS natively

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   index.html                         │
│              <openclaw-app></openclaw-app>            │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │    main.ts      │  imports styles + app
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │     app.ts      │  OpenClawApp (LitElement)
              │  ~100+ @state() │  Single monolithic component
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
  ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
  │ app-render │ │ app-life- │ │ app-gate- │
  │    .ts     │ │  cycle.ts │ │   way.ts  │
  │ renderApp()│ │ connect/  │ │ connect   │
  └─────┬──────┘ │ update    │ │ to GW     │
        │        └───────────┘ └───────────┘
        │
  ┌─────▼──────────────────────────┐
  │         views/*.ts              │
  │  renderChat(), renderAgents(),  │
  │  renderConfig(), renderUsage(), │
  │  renderSessions(), etc.         │
  └─────┬──────────────────────────┘
        │
  ┌─────▼──────────────────────────┐
  │      controllers/*.ts           │
  │  loadSessions(), loadConfig(),  │
  │  loadChat(), loadAgents(), etc. │
  │  (mutate state via GW RPC)      │
  └─────┬──────────────────────────┘
        │
  ┌─────▼──────────────────────────┐
  │       gateway.ts                │
  │  GatewayBrowserClient           │
  │  WebSocket → JSON-RPC frames    │
  └────────────────────────────────┘
```

---

## File Structure

```
ui/
├── index.html                    # Entry point, loads <openclaw-app>
├── package.json                  # Lit, Vite, marked, dompurify
├── vite.config.ts                # Build config
├── vitest.config.ts              # Test config (browser)
├── vitest.node.config.ts         # Test config (node)
├── public/                       # Static assets (favicons)
└── src/
    ├── main.ts                   # Bootstrap: import styles + app
    ├── styles.css                # Global style imports
    ├── styles/                   # CSS files (layout, chat, components)
    │   ├── base.css
    │   ├── chat.css + chat/      # Chat-specific styles
    │   ├── components.css
    │   ├── config.css
    │   ├── layout.css
    │   └── layout.mobile.css
    └── ui/
        ├── app.ts                # OpenClawApp class (main component)
        ├── app-render.ts         # renderApp() — main render dispatch
        ├── app-render.helpers.ts # Shared render helpers
        ├── app-lifecycle.ts      # connected/disconnected/updated hooks
        ├── app-gateway.ts        # Gateway connection setup
        ├── app-chat.ts           # Chat send/abort logic
        ├── app-channels.ts       # Channel config handlers
        ├── app-events.ts         # Event log types
        ├── app-polling.ts        # Periodic data refresh
        ├── app-scroll.ts         # Chat/log scroll management
        ├── app-settings.ts       # Tab switching, theme, settings
        ├── app-tool-stream.ts    # Tool streaming state
        ├── app-view-state.ts     # AppViewState type definition
        ├── app-defaults.ts       # Default values
        ├── gateway.ts            # GatewayBrowserClient (WebSocket)
        ├── navigation.ts         # Tab/route definitions
        ├── storage.ts            # localStorage persistence
        ├── theme.ts              # Theme management
        ├── markdown.ts           # Markdown rendering (marked)
        ├── icons.ts              # SVG icon definitions
        ├── format.ts             # Formatting utilities
        ├── types.ts              # Gateway data types
        ├── ui-types.ts           # UI-specific types
        ├── presenter.ts          # Presentation logic
        ├── views/                # View render functions (per tab)
        │   ├── chat.ts
        │   ├── agents.ts
        │   ├── channels.ts + per-channel views
        │   ├── config.ts + config-form.*.ts
        │   ├── sessions.ts
        │   ├── usage.ts
        │   ├── overview.ts
        │   ├── logs.ts
        │   ├── nodes.ts
        │   ├── skills.ts
        │   ├── cron.ts
        │   ├── debug.ts
        │   ├── instances.ts
        │   └── exec-approval.ts
        ├── controllers/          # Data fetching (GW RPC calls)
        │   ├── chat.ts
        │   ├── sessions.ts
        │   ├── agents.ts
        │   ├── config.ts
        │   ├── channels.ts
        │   ├── usage.ts
        │   ├── logs.ts
        │   ├── nodes.ts
        │   ├── skills.ts
        │   ├── cron.ts
        │   ├── debug.ts
        │   ├── devices.ts
        │   ├── presence.ts
        │   └── exec-approval(s).ts
        ├── chat/                 # Chat rendering internals
        │   ├── grouped-render.ts
        │   ├── message-normalizer.ts
        │   ├── message-extract.ts
        │   ├── tool-cards.ts
        │   ├── tool-helpers.ts
        │   ├── copy-as-markdown.ts
        │   └── constants.ts
        └── components/           # Reusable components
            └── resizable-divider.ts
```

---

## Gateway Connection & Session Management

### WebSocket Protocol

`GatewayBrowserClient` in `gateway.ts` manages a single WebSocket connection:

1. **Connect:** Opens WebSocket to gateway URL
2. **Challenge-Response Auth:** Gateway sends `connect.challenge` event with nonce → client signs with Ed25519 device key and sends `connect` RPC
3. **Hello-OK:** Gateway responds with `hello-ok` containing features, snapshot, auth token
4. **RPC:** All data fetching uses `client.request<T>(method, params)` → JSON frames `{type:"req", id, method, params}` / `{type:"res", id, ok, payload}`
5. **Events:** Gateway pushes `{type:"event", event, payload, seq}` frames for real-time updates
6. **Auto-reconnect:** Exponential backoff (800ms → 15s max), with sequence gap detection

### Authentication Flow

- **Device Identity:** Ed25519 keypair generated and stored in browser (via `@noble/ed25519`)
- **Device Auth Token:** Received from gateway on first connect, stored per device+role
- **Password fallback:** Optional password-based auth
- **Secure context required:** crypto.subtle needed for device auth; falls back to token-only on HTTP

### Session Switching

- `sessionKey` state property tracks active session
- Sessions listed via `sessions.list` RPC
- Session can be patched (label, thinking level) via `sessions.patch` RPC
- Chat history loaded per-session via `chat.history` RPC
- Session key stored in `localStorage` via `storage.ts`

### Key RPC Methods (observed from controllers)

| Method | Controller | Purpose |
|--------|-----------|---------|
| `sessions.list` | sessions.ts | List active sessions |
| `sessions.patch` | sessions.ts | Update session settings |
| `sessions.delete` | sessions.ts | Delete session |
| `chat.history` | chat.ts | Load chat messages |
| `chat.send` | app-chat.ts | Send message |
| `chat.abort` | app-chat.ts | Abort response |
| `config.get` | config.ts | Get gateway config |
| `config.save` | config.ts | Save config |
| `config.apply` | config.ts | Apply config |
| `agents.list` | agents.ts | List agents |
| `channels.status` | channels.ts | Channel status |
| `usage.*` | usage.ts | Usage/cost data |
| `logs.tail` | logs.ts | Log entries |
| `nodes.list` | nodes.ts | Paired nodes |
| `skills.*` | skills.ts | Skill management |
| `cron.*` | cron.ts | Cron jobs |

---

## Key Components

### Chat Panel (`views/chat.ts` + `chat/`)

- Messages rendered via `grouped-render.ts` — groups consecutive messages by role
- Markdown rendering via `marked` library + `dompurify` for sanitization
- Tool calls displayed via `tool-cards.ts` with collapsible output panels
- Streaming responses shown via `chatStream` state property
- File/image attachments via `chatAttachments` state (ChatAttachment type)
- Sidebar panel for viewing full tool output (resizable divider)

### Message Rendering

- `message-normalizer.ts` — normalizes various message formats into a consistent structure
- `message-extract.ts` — extracts text content, tool calls, images from messages
- `tool-helpers.ts` — parses and formats tool call arguments and results
- `chat-markdown.ts` — markdown-to-HTML with syntax highlighting

---

## Tech Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | Lit (Web Components) | 3.3.2 |
| **Build** | Vite | 7.3.1 |
| **Language** | TypeScript | (via Vite) |
| **Markdown** | marked | 17.0.1 |
| **Sanitization** | DOMPurify | 3.3.1 |
| **Crypto** | @noble/ed25519 | 3.0.0 |
| **Testing** | Vitest + Playwright | 4.0.18 |
| **Styling** | Plain CSS (global) | — |
| **State** | Lit @state() (no lib) | — |
| **Routing** | Custom (pushState) | — |

**Zero framework overhead.** No React, no bundled component library, no CSS-in-JS.

---

## Extension Points for Mission Control

### Adding New Pages/Routes

1. Add tab name to `Tab` union type in `navigation.ts`
2. Add to `TAB_GROUPS` array (or create new group)
3. Add path mapping in `TAB_PATHS`
4. Add icon/title/subtitle in the switch statements
5. Create `views/your-page.ts` with a `renderYourPage(state)` function
6. Add case in `renderApp()` in `app-render.ts`
7. Add any new state properties to `app.ts`

### Adding New Components

Components are just functions returning `html` tagged templates. No component registration needed for views. For reusable interactive elements, use `@customElement("your-component")` with LitElement.

### API/Data Fetching Pattern

All data fetching follows this pattern (from controllers):

```typescript
export async function loadSomething(state: SomeState) {
  if (!state.client || !state.connected) return;
  state.loading = true;
  try {
    const res = await state.client.request<ResponseType>("rpc.method", params);
    state.data = res;
  } catch (err) {
    state.error = String(err);
  } finally {
    state.loading = false;
  }
}
```

### WebSocket Event Handling

Events arrive in `app-lifecycle.ts` via the `onEvent` callback. Add new event handlers there or in the relevant controller.

---

## Extension Recommendations for Mission Control

### Recommended Approach: Fork + Restructure

**Don't try to extend the existing monolith in-place.** The single-component architecture with 100+ state properties will not scale for Mission Control's needs.

**Recommended steps:**

1. **Fork the `ui/` directory** as the Mission Control base
2. **Extract `GatewayBrowserClient`** — this is clean, well-isolated, and reusable as-is
3. **Keep the view/controller pattern** — it's simple and works well
4. **Break up `app.ts`** into multiple LitElement components or adopt a lightweight state management layer
5. **Add a proper router** — consider a Lit-compatible router (e.g., `@lit-labs/router` or Navigo) for nested routes (project → agents → chat)
6. **Keep Vite** — the build setup is clean and minimal

### What to Reuse Directly

- `gateway.ts` — WebSocket client (copy as-is)
- `navigation.ts` — Tab system pattern (extend with new tabs)
- `markdown.ts` — Markdown rendering
- `chat/` — Chat rendering logic (grouped messages, tool cards)
- `controllers/` — Data fetching patterns
- `storage.ts` — localStorage helpers
- `theme.ts` — Theme system
- `icons.ts` — SVG icons
- CSS structure (adapt, don't rewrite)

### What Needs Rewriting

- `app.ts` — Must be decomposed; 100+ state properties is unmaintainable with added Mission Control features
- `app-render.ts` — Too monolithic; split per-feature
- State management — Consider Lit's `@provide`/`@consume` context protocol or a simple store

### New Components Needed for Mission Control

| Component | Purpose | Reuse from GW UI |
|-----------|---------|------------------|
| Project Board | Kanban/list view | New |
| Agent Monitor | Live agent status | Partial (views/agents.ts) |
| Cost Dashboard | Usage/spend tracking | Partial (views/usage.ts) |
| Per-Project Chat | Scoped chat sessions | High (views/chat.ts) |
| Multi-Session Panel | Switch between project sessions | Partial (views/sessions.ts) |

---

## Gotchas & Challenges for Frontend Agent

### ⚠️ Monolithic State
The single `OpenClawApp` class owns ALL state. Adding Mission Control features here would create an unmanageable God Object. **Must decompose before extending.**

### ⚠️ No Shadow DOM
The app uses `createRenderRoot` override (implied by global CSS usage) — styles are global, not encapsulated. CSS class collisions are possible when adding new features.

### ⚠️ Imports from Parent Directory
`gateway.ts` imports from `../../../src/gateway/` — the UI reaches into the main OpenClaw source tree for shared types. A fork must either:
- Copy these shared types
- Set up proper package imports
- Use a monorepo structure

### ⚠️ Device Auth Complexity
The Ed25519 device identity system is sophisticated but requires `crypto.subtle` (HTTPS only). Mission Control should reuse this as-is rather than reimplementing.

### ⚠️ No Component Library
There's no UI component library (no Material, no Shoelace). All UI is hand-built HTML+CSS. Mission Control may benefit from adopting a Web Components library like Shoelace for common widgets (tables, modals, forms).

### ⚠️ Single WebSocket Connection
The UI assumes one gateway connection. Mission Control may need to connect to multiple gateways or manage multiple agent sessions concurrently. The `GatewayBrowserClient` supports this (it's a class, not a singleton), but the app state assumes one.

---

## Self-Review

1. **Design clarity:** ✅ Frontend agent can understand the codebase structure, patterns, and extension points without ambiguity
2. **Appropriate complexity:** ✅ Documented what exists; recommendations are right-sized (no over-engineering)
3. **Trade-offs documented:** ✅ Fork vs extend, state management options, component library choice
4. **Boundary respect:** ✅ No implementation code written; pure architectural analysis
