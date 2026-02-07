# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
bun install                # Install all dependencies
bun run build              # Build all apps via Turborepo
bun run static-analysis    # Run all checks: lint, format, typecheck, knip (dead code)
bun run check              # Lint + format check only
bun run check:fix          # Auto-fix lint + format
bun run typecheck          # TypeScript check across all workspaces
bun run knip               # Dead code detection

# Dev servers (run per-workspace — there is no root `dev` script)
cd apps/backend && bun run dev       # Convex dev server
cd apps/backend && bun run dev:setup # Initial Convex project bootstrap
cd apps/web && bun run dev           # Next.js dev server (port 3000 by default)
cd apps/agent && bun run dev         # Agent with --watch

# Add shadcn/ui components (from apps/web)
cd apps/web && bunx shadcn@latest add <component>
```

### Validation Strategy

- Single-workspace changes: run `bun run lint`, `bun run format:check`, `bun run typecheck` inside that workspace.
- Cross-workspace changes: run `bun run check`, `bun run typecheck`, `bun run knip` from the repo root (or `bun run static-analysis` for a full pass).

## Architecture

**Bun monorepo** (workspaces in `apps/*` and `packages/*`) with **Turborepo** for task orchestration.

### Apps

- **`apps/web`** — Next.js 16 + React 19 + shadcn/ui + TailwindCSS v4 + React Compiler. Route protection via Clerk middleware in `src/proxy.ts`. Protected routes: `/chat(.*)`, `/dashboard(.*)`, `/skills(.*)`. Route groups: `(app)` for authenticated content, `(auth)` for sign-in/sign-up.
- **`apps/backend`** — Convex backend. Schema in `convex/schema.ts`, functions in `convex/*.ts`. Types auto-generated in `convex/_generated/` (do not edit). Clerk webhook at `/clerk/webhook` via `convex/http.ts`.
- **`apps/agent`** — Bun CLI process that subscribes to Convex for pending agent jobs, generates AI responses via Vercel AI SDK (`ai` + `@ai-sdk/gateway`), and optionally sends replies over WhatsApp (Baileys). Entry point: `src/index.ts`. Deployable via `Dockerfile.agent`.

### Packages

- **`packages/config`** — Shared `tsconfig.base.json` (strict mode, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, ESNext target).
- **`packages/env`** — Zod-validated environment schemas. Exports `./web` (t3-env) and `./agent`.

### Import Aliases

- Web: `@/*` → `apps/web/src/*`
- Cross-workspace: `@zenthor-assist/backend/convex/_generated/*`, `@zenthor-assist/env/web`, `@zenthor-assist/env/agent`
- Agent: uses relative imports (no `@/*` alias).

### Data Flow

1. User sends message (web UI or WhatsApp) → `api.messages.send` mutation creates message + `agentQueue` job
2. Agent subscribes via `client.onUpdate(api.agent.getPendingJobs)` → claims job → fetches conversation context
3. `generateResponse()` calls AI model with tools and conversation history → stores assistant message (with streaming placeholder updates for web)
4. Web UI receives update in real-time via Convex subscription; WhatsApp replies sent via Baileys

### Agent Tool System

Tools are defined using Vercel AI SDK's `tool()` with Zod schemas in `apps/agent/src/agent/tools/`. Register new tools by exporting from `tools/index.ts` — they're automatically available to the model.

Web search is handled separately via `getWebSearchTool()` in `tools/web-search.ts`, which detects the AI provider prefix from `AI_MODEL` (e.g. `anthropic/`, `google/`, `openai/`) and returns the corresponding provider-native search tool.

### Database Schema (Convex)

Key tables: `users` (synced from Clerk), `contacts` (WhatsApp whitelist), `conversations` (channel: `whatsapp` | `web`), `messages` (role, content, optional toolCalls, streaming flag), `skills` (extensibility, schema-ready), `agentQueue` (job lifecycle: `pending` → `processing` → `completed`/`failed`), `whatsappSession`.

### Web Providers Stack

`providers.tsx` wraps the app: ThemeProvider → ThemedClerkProvider (dark/light aware) → ConvexProviderWithClerk → Toaster (Sonner).

### Chat UI (AI Elements)

The web chat interface uses **AI Elements** — a shadcn/ui-based component library installed as source files under `apps/web/src/components/ai-elements/`. These are owned source files (not node_modules) and can be customized.

#### Component Library

| AI Elements Component | Location | Purpose |
|---|---|---|
| `conversation` | `ai-elements/conversation.tsx` | Auto-scrolling container with scroll-to-bottom button (`use-stick-to-bottom`) |
| `message` | `ai-elements/message.tsx` | Message bubbles with role-based alignment, markdown via Streamdown |
| `prompt-input` | `ai-elements/prompt-input.tsx` | Rich text input with Enter/Shift+Enter, file upload support |
| `tool` | `ai-elements/tool.tsx` | Collapsible tool call display with status badges |
| `confirmation` | `ai-elements/confirmation.tsx` | AI SDK approval flow (installed but not used — see Adapter Pattern below) |
| `code-block` | `ai-elements/code-block.tsx` | Syntax-highlighted code blocks via Shiki |

#### Adding new AI Elements components

```bash
cd apps/web
bunx ai-elements@latest add <component-name>
# Answer "n" to overwrite prompts for existing UI files
bunx oxfmt --write src/components/ai-elements/
```

New AI Elements components are auto-ignored by knip (see `"ignore"` in `apps/web/package.json`).

#### Adapter Pattern: Convex → AI Elements

AI Elements components expect AI SDK types (`UIMessage`, `ToolUIPart`, etc.) but our data comes from **Convex queries**. The adapter hook `use-convex-messages.ts` bridges this gap:

```
Convex queries → useConvexMessages(conversationId) → { messages, isProcessing, pendingApprovals, sendMessage }
                                                        ↓
                                                  chat-area.tsx renders with AI Elements
```

**Key decisions:**
- `Message from={role}` accepts `"user" | "assistant" | "system"` — matches our Convex schema directly.
- `MessageResponse` renders markdown via Streamdown (GFM + math + mermaid + CJK). No `react-markdown` needed.
- Tool calls use `ToolHeader type="dynamic-tool" toolName={name}` because our tools are dynamically named (not statically typed with AI SDK's `tool-${NAME}` pattern).
- Tool approvals use a custom `ApprovalCard` with `Alert` instead of the `Confirmation` component, because our `status: "pending"|"approved"|"rejected"` model doesn't map to AI SDK's `ToolUIPart["state"]` machine.
- Message grouping (120s threshold, `position: first|middle|last|single`) is computed in the adapter hook and applied via wrapper `<div>` spacing classes.

#### Chat File Structure

```
src/components/chat/
├── chat-area.tsx              # Main chat view — composes AI Elements
├── use-convex-messages.ts     # Adapter hook: Convex → component-friendly shape
└── typing-indicator.tsx       # Bounce-dot indicator (22 lines, kept as-is)
```

#### Error Handling Pattern

Mutations (`sendMessage`, `resolve`) wrap calls in try/catch with:
- `toast.error(...)` for user-facing feedback (via Sonner)
- `logWebClientEvent(...)` for observability telemetry

#### When Expanding the Chat UI

- **New message types** (e.g., images, files): Add to `ChatMessage` interface in `use-convex-messages.ts`, render in the message map in `chat-area.tsx`.
- **New tool states**: Update `ToolHeader state` prop. Valid states: `input-streaming`, `input-available`, `output-available`, `output-error`, `output-denied`, `approval-requested`, `approval-responded`.
- **Message actions** (copy, retry, etc.): Use `MessageActions` + `MessageAction` from `ai-elements/message.tsx`.
- **Branching/edits**: Use `MessageBranch` + `MessageBranchContent` + `MessageBranchSelector` from `ai-elements/message.tsx`.
- **File attachments in prompt**: Use `PromptInputActionMenu` + `PromptInputActionAddAttachments` from `ai-elements/prompt-input.tsx`.

## Code Style

- **Formatter**: Oxfmt — tabs (width 2), double quotes, auto-sorted imports (builtin → external → internal → relative), Tailwind class sorting via `cn`/`clsx`/`cva`/`twMerge`
- **Linter**: Oxlint — plugins: unicorn, typescript, oxc, react, react-hooks
- **Key rules**: `no-explicit-any` (error), `consistent-type-imports` (error), `eqeqeq` (error), `no-console` (warn, allows info/warn/error/debug)
- **Unused vars**: Prefix with `_` to ignore (pattern: `^_`)
- **File naming**: kebab-case (e.g., `chat-area.tsx`, `nav-conversations.tsx`)
- **Convex functions**: Use `query()`, `mutation()`, `internalMutation()` from `convex/server`. Types come from `convex/_generated/`.

## Environment Variables

Use `.env.local` files per app (never committed). Run `bun run dev:setup` in `apps/backend` to configure Convex initially. Convex dashboard env for deployed backend functions.

- **Agent**: `CONVEX_URL`, `AI_GATEWAY_API_KEY` (required). `AI_MODEL` defaults to `anthropic/claude-sonnet-4-20250514` (accepts `provider/model`). Optional: `AGENT_SECRET`, `ENABLE_WHATSAPP`.
- **Web**: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- **Backend**: `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`, `CLERK_SECRET_KEY`.
