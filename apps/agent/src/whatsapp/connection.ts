import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState as loadAuthState,
} from "baileys";

import { handleIncomingMessage } from "./handler";
import { setWhatsAppSocket } from "./sender";

const AUTH_DIR = ".whatsapp-auth";

const logger = {
  level: "warn",
  child() {
    return logger;
  },
  trace() {},
  debug() {},
  info() {},
  warn(obj: unknown, msg?: string) {
    console.warn("[baileys]", msg || obj);
  },
  error(obj: unknown, msg?: string) {
    console.error("[baileys]", msg || obj);
  },
} as never;

export async function startWhatsApp() {
  const { version } = await fetchLatestBaileysVersion();
  console.info(`[whatsapp] Using Baileys version ${version.join(".")}`);

  const { state, saveCreds } = await loadAuthState(AUTH_DIR);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: true,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["zenthor-assist", "cli", "1.0.0"],
  });

  setWhatsAppSocket(sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.info("[whatsapp] QR code printed above — scan with WhatsApp");
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.info(
        `[whatsapp] Connection closed (status: ${statusCode}), reconnecting: ${shouldReconnect}`,
      );
      if (shouldReconnect) {
        startWhatsApp();
      }
    } else if (connection === "open") {
      console.info("[whatsapp] Connected successfully");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      try {
        await handleIncomingMessage(msg);
      } catch (error) {
        console.error("[whatsapp] Error handling message:", error);
      }
    }
  });

  return sock;
}
