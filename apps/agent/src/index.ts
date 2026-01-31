import { startAgentLoop } from "./agent/loop";
import { startWhatsApp } from "./whatsapp/connection";

async function main() {
  console.log("[main] Starting gbarros-assistant agent...");

  const requiredEnv = ["CONVEX_URL", "ANTHROPIC_API_KEY"];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`[main] Missing required env var: ${key}`);
      process.exit(1);
    }
  }

  startAgentLoop();

  const enableWhatsApp = process.env["ENABLE_WHATSAPP"] !== "false";
  if (enableWhatsApp) {
    try {
      await startWhatsApp();
    } catch (error) {
      console.error("[main] Failed to start WhatsApp:", error);
      console.log("[main] Agent will continue without WhatsApp");
    }
  } else {
    console.log("[main] WhatsApp disabled via ENABLE_WHATSAPP=false");
  }

  console.log("[main] Agent is running");
}

main().catch((error) => {
  console.error("[main] Fatal error:", error);
  process.exit(1);
});
