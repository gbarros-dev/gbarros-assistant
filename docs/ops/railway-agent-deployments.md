# Railway Deployments for `apps/agent` (Dev + Prod)

## Deployment Type to Choose

From the Railway "What would you like to create?" modal, choose:

- `GitHub Repository`

Reason: `apps/agent` is part of a Bun monorepo and should deploy directly from your repo.

## Target Topology

Create **2 services** in one Railway project, then use Railway environments so each service exists in both `production` and `development`:

1. `agent-core`
2. `agent-whatsapp`

This gives you 4 runtime instances total:

1. `agent-core` in `production`
2. `agent-whatsapp` in `production`
3. `agent-core` in `development`
4. `agent-whatsapp` in `development`

## Step-by-Step

1. Create a Railway project using `GitHub Repository` and connect this repo.
2. Keep/create a service named `agent-core`.
3. Duplicate that service (or create another from the same repo) and name it `agent-whatsapp`.
4. For both services, open `Settings` and set:
   - `Root Directory`: `/apps/agent`
   - `Build Command`: `bun install --frozen-lockfile`
5. Set service-specific `Start Command`:
   - `agent-core`: `bun run start:core`
   - `agent-whatsapp`: `bun run start:whatsapp`
6. Create a `development` environment from Railway environments (duplicate `production` so settings are copied).
7. Set variables for each service in each environment (matrix below).
8. Deploy `development` first, validate logs and Axiom ingestion, then deploy `production`.

## Environment Variables Matrix

## Shared Required Variables (both services, both environments)

- `CONVEX_URL`
- `AI_GATEWAY_API_KEY`
- `AXIOM_TOKEN`
- `AXIOM_DATASET`
- `OBS_ENABLED`
- `OBS_SAMPLE_RATE`
- `OBS_LOG_LEVEL`
- `OBS_INCLUDE_CONTENT`
- `OBS_ENV`

## `agent-core` Variables

### Production

```env
AGENT_ROLE=core
ENABLE_WHATSAPP=false

CONVEX_URL=<your-convex-prod-url>
AI_GATEWAY_API_KEY=<your-prod-key>

AXIOM_TOKEN=<your-axiom-token>
AXIOM_DATASET=zenthor-assist-agent-prod
OBS_ENABLED=true
OBS_SAMPLE_RATE=1
OBS_LOG_LEVEL=info
OBS_INCLUDE_CONTENT=false
OBS_ENV=prod
```

### Development

```env
AGENT_ROLE=core
ENABLE_WHATSAPP=false

CONVEX_URL=<your-convex-dev-url>
AI_GATEWAY_API_KEY=<your-dev-key>

AXIOM_TOKEN=<your-axiom-token>
AXIOM_DATASET=zenthor-assist-agent-dev
OBS_ENABLED=true
OBS_SAMPLE_RATE=1
OBS_LOG_LEVEL=info
OBS_INCLUDE_CONTENT=false
OBS_ENV=dev
```

## `agent-whatsapp` Variables

### Production

```env
AGENT_ROLE=whatsapp
ENABLE_WHATSAPP=true
WORKER_ID=agent-whatsapp-prod-1

CONVEX_URL=<your-convex-prod-url>
AI_GATEWAY_API_KEY=<your-prod-key>

AXIOM_TOKEN=<your-axiom-token>
AXIOM_DATASET=zenthor-assist-agent-prod
OBS_ENABLED=true
OBS_SAMPLE_RATE=1
OBS_LOG_LEVEL=info
OBS_INCLUDE_CONTENT=false
OBS_ENV=prod

# WhatsApp runtime
WHATSAPP_ACCOUNT_ID=default
WHATSAPP_PHONE=<prod-whatsapp-phone>
# Optional tuning
# WHATSAPP_LEASE_TTL_MS=45000
# WHATSAPP_HEARTBEAT_MS=15000
```

### Development

```env
AGENT_ROLE=whatsapp
ENABLE_WHATSAPP=true
WORKER_ID=agent-whatsapp-dev-1

CONVEX_URL=<your-convex-dev-url>
AI_GATEWAY_API_KEY=<your-dev-key>

AXIOM_TOKEN=<your-axiom-token>
AXIOM_DATASET=zenthor-assist-agent-dev
OBS_ENABLED=true
OBS_SAMPLE_RATE=1
OBS_LOG_LEVEL=info
OBS_INCLUDE_CONTENT=false
OBS_ENV=dev

# WhatsApp runtime
WHATSAPP_ACCOUNT_ID=default
WHATSAPP_PHONE=<dev-whatsapp-phone>
# Optional tuning
# WHATSAPP_LEASE_TTL_MS=45000
# WHATSAPP_HEARTBEAT_MS=15000
```

## Optional Recommended Variables

- `AI_MODEL=anthropic/claude-sonnet-4-20250514`
- `AI_FALLBACK_MODEL=<fallback-model>`
- `RELEASE_SHA=<git-sha>` (helps telemetry correlation if used by your runtime context)

## Quick Validation Checklist

1. `agent-core` logs show startup with role `core`.
2. `agent-whatsapp` logs show lease acquisition and WhatsApp runtime startup.
3. Axiom `zenthor-assist-agent-dev` receives development events.
4. Axiom `zenthor-assist-agent-prod` receives production events.
5. In Axiom, filter by fields:
   - `app = "agent"`
   - `service` (`agent-core` or `agent-whatsapp`)
   - `deployment` / `env` (`dev` or `prod`)
   - `role` (`core` or `whatsapp`)

## References

- Railway Monorepo guide: https://docs.railway.com/guides/monorepo
- Railway Build configuration: https://docs.railway.com/guides/build-configuration
- Railway Start command: https://docs.railway.com/guides/start-command
- Railway Environments: https://docs.railway.com/reference/environments
- Railway Variables: https://docs.railway.com/guides/variables
