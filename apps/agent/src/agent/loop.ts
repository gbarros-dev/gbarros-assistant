import { api } from "@gbarros-assistant/backend/convex/_generated/api";
import { getConvexClient } from "../convex/client";
import { generateResponse } from "./claude";
import { sendWhatsAppMessage } from "../whatsapp/sender";

export function startAgentLoop() {
  const client = getConvexClient();
  console.log("[agent] Starting agent loop — subscribing to pending jobs...");

  client.onUpdate(api.agent.getPendingJobs, {}, async (jobs) => {
    if (!jobs || jobs.length === 0) return;

    for (const job of jobs) {
      try {
        const claimed = await client.mutation(api.agent.claimJob, { jobId: job._id });
        if (!claimed) continue;

        console.log(`[agent] Processing job ${job._id} for conversation ${job.conversationId}`);

        const context = await client.query(api.agent.getConversationContext, {
          conversationId: job.conversationId,
        });
        if (!context) {
          await client.mutation(api.agent.failJob, { jobId: job._id });
          continue;
        }

        const conversationMessages = context.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        const response = await generateResponse(conversationMessages);

        await client.mutation(api.messages.addAssistantMessage, {
          conversationId: job.conversationId,
          content: response.content,
          channel: context.conversation.channel,
          toolCalls: response.toolCalls,
        });

        if (context.conversation.channel === "whatsapp" && context.contact?.phone) {
          await sendWhatsAppMessage(context.contact.phone, response.content);
        }

        await client.mutation(api.agent.completeJob, { jobId: job._id });
        console.log(`[agent] Completed job ${job._id}`);
      } catch (error) {
        console.error(`[agent] Failed job ${job._id}:`, error);
        await client.mutation(api.agent.failJob, { jobId: job._id }).catch(() => {});
      }
    }
  });
}
