import { startAgentLoop } from "./agent/loop";
import { startWhatsAppRuntime } from "./whatsapp/runtime";

async function main() {
  console.info("[main] Starting zenthor-assist agent...");

  const requiredEnv = ["CONVEX_URL", "AI_GATEWAY_API_KEY"];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`[main] Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  const role = (process.env["AGENT_ROLE"] ?? "all").toLowerCase();
  const enableWhatsApp = process.env["ENABLE_WHATSAPP"] !== "false";

  if (role === "core" || role === "all") {
    startAgentLoop();
  }

  if (!enableWhatsApp) {
    console.info("[main] WhatsApp disabled via ENABLE_WHATSAPP=false");
  } else if (role === "whatsapp" || role === "all") {
    await startWhatsAppRuntime({ enableIngress: true, enableEgress: true });
  } else if (role === "whatsapp-ingress") {
    await startWhatsAppRuntime({ enableIngress: true, enableEgress: false });
  } else if (role === "whatsapp-egress") {
    await startWhatsAppRuntime({ enableIngress: false, enableEgress: true });
  }

  console.info(`[main] Agent is running (role: ${role})`);
}

main().catch((error) => {
  console.error("[main] Fatal error:", error);
  process.exit(1);
});
