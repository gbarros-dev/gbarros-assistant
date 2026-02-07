import { api } from "@zenthor-assist/backend/convex/_generated/api";
import { env } from "@zenthor-assist/env/agent";

import { getConvexClient } from "../convex/client";
import { startWhatsApp } from "./connection";
import { sendWhatsAppMessage } from "./sender";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface WhatsAppRuntimeOptions {
  enableIngress: boolean;
  enableEgress: boolean;
}

async function acquireLease(accountId: string, ownerId: string): Promise<void> {
  const client = getConvexClient();

  while (true) {
    const lease = await client.mutation(api.whatsappLeases.acquireLease, {
      accountId,
      ownerId,
      ttlMs: env.WHATSAPP_LEASE_TTL_MS,
    });
    if (lease.acquired) {
      console.info(`[whatsapp] Lease acquired for account '${accountId}' by '${ownerId}'`);
      return;
    }

    console.info(
      `[whatsapp] Lease held by '${lease.ownerId ?? "unknown"}' for account '${accountId}', retrying...`,
    );
    await sleep(3_000);
  }
}

async function startOutboundLoop(accountId: string, ownerId: string): Promise<void> {
  const client = getConvexClient();
  console.info("[whatsapp] Starting outbound delivery loop...");

  while (true) {
    try {
      const job = await client.mutation(api.delivery.claimNextOutbound, {
        processorId: ownerId,
        channel: "whatsapp",
        accountId,
        lockMs: 30_000,
      });
      if (!job) {
        await sleep(1_000);
        continue;
      }

      if (!job.to) {
        await client.mutation(api.delivery.failOutbound, {
          id: job._id,
          error: "Missing recipient phone for WhatsApp outbound message",
          retry: false,
        });
        continue;
      }

      try {
        await sendWhatsAppMessage(job.to, job.payload.content);
        await client.mutation(api.delivery.completeOutbound, { id: job._id });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await client.mutation(api.delivery.failOutbound, {
          id: job._id,
          error: errorMessage,
          retry: true,
        });
      }
    } catch (error) {
      console.error("[whatsapp] Outbound loop error:", error);
      await sleep(2_000);
    }
  }
}

export async function startWhatsAppRuntime(options: WhatsAppRuntimeOptions): Promise<void> {
  const client = getConvexClient();
  const accountId = env.WHATSAPP_ACCOUNT_ID ?? "default";
  const ownerId = env.WORKER_ID ?? `worker-${process.pid}`;
  const heartbeatMs = Math.max(5_000, env.WHATSAPP_HEARTBEAT_MS ?? 15_000);

  await client.mutation(api.whatsappLeases.upsertAccount, {
    accountId,
    phone: env.WHATSAPP_PHONE ?? accountId,
    enabled: true,
  });

  await acquireLease(accountId, ownerId);
  await startWhatsApp({ enableIngress: options.enableIngress });

  setInterval(() => {
    client
      .mutation(api.whatsappLeases.heartbeatLease, {
        accountId,
        ownerId,
        ttlMs: env.WHATSAPP_LEASE_TTL_MS,
      })
      .then((ok) => {
        if (!ok) {
          console.error(
            `[whatsapp] Lease heartbeat lost for account '${accountId}' (owner '${ownerId}')`,
          );
        }
      })
      .catch((error) => {
        console.error("[whatsapp] Lease heartbeat error:", error);
      });
  }, heartbeatMs);

  const release = async () => {
    try {
      await client.mutation(api.whatsappLeases.releaseLease, {
        accountId,
        ownerId,
      });
    } catch {}
  };

  process.once("SIGINT", () => {
    release().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    release().finally(() => process.exit(0));
  });

  if (options.enableEgress) {
    void startOutboundLoop(accountId, ownerId);
  }
}
