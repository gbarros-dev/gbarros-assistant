import { api } from "@zenthor-assist/backend/convex/_generated/api";
import type { WAMessage } from "baileys";

import { getConvexClient } from "../convex/client";
import { logger } from "../observability/logger";

export async function handleIncomingMessage(message: WAMessage) {
  const client = getConvexClient();

  const jid = message.key.remoteJid;
  if (!jid || jid === "status@broadcast") return;
  if (message.key.fromMe) return;

  const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
  if (!text) return;

  const phone = jid.replace("@s.whatsapp.net", "");
  console.info(`[whatsapp] Incoming from ${phone}: ${text.substring(0, 50)}...`);
  void logger.info("whatsapp.inbound.received", {
    phone,
    jid,
    messageLength: text.length,
  });

  let contact = await client.query(api.contacts.getByPhone, { phone });

  if (!contact) {
    await client.mutation(api.contacts.create, {
      phone,
      name: phone,
      isAllowed: false,
    });
    contact = await client.query(api.contacts.getByPhone, { phone });
  }

  if (!contact || !contact.isAllowed) {
    console.info(`[whatsapp] Ignoring message from non-allowed contact: ${phone}`);
    void logger.warn("whatsapp.inbound.ignored_not_allowed", { phone });
    return;
  }

  const conversationId = await client.mutation(api.conversations.getOrCreate, {
    contactId: contact._id,
    channel: "whatsapp",
  });

  // Check for pending tool approvals before normal message handling
  const pendingApprovals = await client.query(api.toolApprovals.getPendingByConversation, {
    conversationId,
  });

  if (pendingApprovals.length > 0) {
    const normalized = text.trim().toUpperCase();
    const approveWords = new Set(["YES", "Y", "APPROVE", "SIM"]);
    const rejectWords = new Set(["NO", "N", "REJECT", "NAO", "NÃO"]);

    if (approveWords.has(normalized) || rejectWords.has(normalized)) {
      const status = approveWords.has(normalized) ? "approved" : "rejected";
      await client.mutation(api.toolApprovals.resolve, {
        approvalId: pendingApprovals[0]!._id,
        status,
      });
      console.info(
        `[whatsapp] Tool approval ${status} by ${phone} for approval ${pendingApprovals[0]!._id}`,
      );
      void logger.info("agent.tool.approval.resolved_whatsapp", {
        approvalId: pendingApprovals[0]!._id,
        status,
        phone,
        conversationId,
      });
      return;
    }
  }

  await client.mutation(api.messages.send, {
    conversationId,
    content: text,
    channel: "whatsapp",
  });

  console.info(`[whatsapp] Queued message from ${phone} for processing`);
  void logger.info("whatsapp.inbound.queued", {
    phone,
    conversationId,
  });
}
