# Agent Guidelines for zenthor-assist

## Repository Snapshot

Verified against this repository on 2026-02-07.

- Monorepo: Bun workspaces + Turborepo
- Apps:
  - `apps/web` (`@zenthor-assist/web`) - Next.js 16 + React 19 + TailwindCSS v4 + shadcn/ui
  - `apps/backend` (`@zenthor-assist/backend`) - Convex backend
  - `apps/agent` (`@zenthor-assist/agent`) - Bun agent runtime (AI SDK + optional WhatsApp via Baileys)
- Packages:
  - `packages/config` - shared TypeScript base config
  - `packages/env` - typed env validators for web/agent
- Tooling: Oxlint, Oxfmt, TypeScript, Knip

## Core Engineering Practices

- Prefer small, focused changes over broad refactors.
- Keep functions small and readable; avoid unnecessary abstraction.
- Ensure error handling is explicit and actionable.
- Favor clear naming and consistent style across the codebase.
- Write code that is easy to test and easy to reason about.

## Command Reference (Verified)

### Root commands

| Command                    | Description                             |
| -------------------------- | --------------------------------------- |
| `bun install`              | Install dependencies for all workspaces |
| `bun run build`            | Run Turborepo build pipeline            |
| `bun run lint`             | Oxlint at repo root                     |
| `bun run lint:fix`         | Oxlint with autofix                     |
| `bun run format`           | Oxfmt write mode                        |
| `bun run format:check`     | Oxfmt check mode                        |
| `bun run check`            | `oxlint && oxfmt --check`               |
| `bun run check:fix`        | `oxlint --fix && oxfmt --write`         |
| `bun run typecheck`        | `turbo run typecheck`                   |
| `bun run knip`             | `turbo run knip --continue`             |
| `bun run knip:fix`         | `turbo run knip:fix --continue`         |
| `bun run static-analysis`  | lint + format check + typecheck + knip  |
| `bun run clean`            | Destructive cleanup of root artifacts   |
| `bun run clean:workspaces` | Run workspace `clean` scripts           |

Important:

- There is currently no root `dev` script in `package.json`.
- `turbo run dev` is not configured (`dev` task missing in `turbo.json`).
- Run dev servers per workspace instead.

### Workspace dev commands

| Workspace | Command                                | Notes                                                       |
| --------- | -------------------------------------- | ----------------------------------------------------------- |
| backend   | `cd apps/backend && bun run dev`       | Starts Convex dev server                                    |
| backend   | `cd apps/backend && bun run dev:setup` | Initial Convex bootstrap/configure                          |
| web       | `cd apps/web && bun run dev`           | Next.js dev server (default port 3000 unless `PORT` is set) |
| agent     | `cd apps/agent && bun run dev`         | Bun watch mode for the agent runtime                        |

## Validation Expectations

- For docs-only changes, no runtime checks are required.
- For code changes in one workspace, prefer targeted checks in that workspace:
  - `bun run lint`
  - `bun run format:check`
  - `bun run typecheck`
- For cross-workspace changes, run root checks:
  - `bun run check`
  - `bun run typecheck`
  - `bun run knip` (or `bun run static-analysis` for full pass)

## Project Structure

```txt
zenthor-assist/
├── apps/
│   ├── web/
│   │   ├── src/app/                  # App Router routes (route groups: (app), (auth))
│   │   ├── src/components/           # UI and feature components
│   │   ├── src/hooks/
│   │   ├── src/lib/
│   │   └── src/proxy.ts              # Clerk route protection (Next 16 proxy)
│   ├── backend/
│   │   └── convex/
│   │       ├── schema.ts             # Data model
│   │       ├── http.ts               # Convex HTTP router
│   │       ├── clerk/                # Clerk webhook + sync handlers
│   │       └── _generated/           # Generated Convex types (do not edit)
│   └── agent/
│       └── src/
│           ├── agent/                # Agent loop + generation + tools
│           ├── convex/               # Convex client wiring
│           └── whatsapp/             # Baileys integration
├── packages/
│   ├── config/                       # Shared tsconfig.base.json
│   └── env/                          # Typed env schemas (`./web`, `./agent`)
├── turbo.json
├── .oxlintrc.json
└── .oxfmtrc.json
```

## Architecture Notes

### Web (`apps/web`)

- Next.js 16 App Router with `typedRoutes: true` and `reactCompiler: true` (`apps/web/next.config.ts`).
- Global providers are in `apps/web/src/components/providers.tsx`:
  - Clerk auth context
  - Convex React client
  - Theme provider + Sonner toaster
- Protected routes are enforced in `apps/web/src/proxy.ts` for:
  - `/chat(.*)`
  - `/dashboard(.*)`
  - `/skills(.*)`

### Backend (`apps/backend/convex`)

- Schema is defined in `apps/backend/convex/schema.ts`.
- Core tables:
  - `users`, `contacts`, `conversations`, `messages`, `skills`, `whatsappSession`, `agentQueue`
- Clerk webhook endpoint is mounted at `/clerk/webhook` via `apps/backend/convex/http.ts`.
- Convex-generated files are under `apps/backend/convex/_generated` and should not be manually edited.

### Agent (`apps/agent`)

- Entry point: `apps/agent/src/index.ts`.
- Main loop subscribes to pending jobs via `api.agent.getPendingJobs`, claims jobs, generates responses, and writes results back to Convex.
- Web conversations use streaming placeholder updates; WhatsApp conversations send final text via Baileys.
- Built-in tool registration starts in `apps/agent/src/agent/tools/index.ts`; provider-specific web search tooling is added in `tools/web-search.ts`.

## Environment Variables

Use `.env.local` files per app (gitignored) and Convex dashboard env for deployed Convex functions.

### Web env (`@zenthor-assist/env/web`)

Required:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Agent env (`@zenthor-assist/env/agent`)

Required:

- `CONVEX_URL`
- `AI_GATEWAY_API_KEY`

Optional:

- `AI_MODEL` (defaults to `anthropic/claude-sonnet-4-20250514`)
- `AGENT_SECRET`
- `ENABLE_WHATSAPP` (`false` disables WhatsApp startup)

### Backend/Convex env (read directly in Convex functions)

Commonly required by current code:

- `CLERK_JWT_ISSUER_DOMAIN` (`auth.config.ts`)
- `CLERK_WEBHOOK_SECRET` (`clerk/http.ts`)
- `CLERK_SECRET_KEY` (`clerk/sync.ts`)

## TypeScript and Style Rules

- Base TS config (`packages/config/tsconfig.base.json`) enforces:
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
  - `verbatimModuleSyntax: true`
- Lint:
  - `typescript/no-explicit-any`: error
  - `typescript/consistent-type-imports`: error
  - `eqeqeq`: error
  - `react-hooks/rules-of-hooks`: error
  - Unused vars/args must use `_` prefix to be ignored
- Formatting:
  - Tabs, width 2, double quotes, sorted imports (Oxfmt)
  - Tailwind classes are formatter-aware

## Import and Alias Conventions

- Web alias:
  - `@/*` -> `apps/web/src/*`
- Shared package imports:
  - `@zenthor-assist/backend/convex/_generated/*`
  - `@zenthor-assist/env/web`
  - `@zenthor-assist/env/agent`
- Agent code currently uses relative imports (no local `@/*` alias configured).

## Generated and Sensitive Files

- Do not edit generated outputs directly:
  - `apps/backend/convex/_generated/**`
  - `.next/**`, `dist/**`, `.turbo/**`
- Do not commit secrets:
  - `.env*`, `.env*.local` are gitignored

## Testing Guidance

- There is no dedicated test suite currently in this repo.
- If adding tests:
  - Co-locate as `*.test.ts` or `*.test.tsx`
  - Use Bun test runner (`bun test`)
  - Prefer targeted runs over broad suites

## PR and Collaboration Guidelines

- Keep PRs focused on a single purpose.
- Document non-obvious decisions and tradeoffs.
- Use imperative commit messages.
- Run the most relevant checks before opening a PR.
- Include screenshots for UI changes.
