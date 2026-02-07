import { env } from "@zenthor-assist/env/agent";
import {
  getDefaultRuntimeContext,
  redactPayload,
  shouldSample,
} from "@zenthor-assist/observability";
import pino, {
  type DestinationStream,
  type Logger as PinoLogger,
  type LoggerOptions,
  type TransportTargetOptions,
} from "pino";

type EventPayload = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

function resolveServiceName() {
  const role = (process.env["AGENT_ROLE"] ?? "all").toLowerCase();
  if (role === "core") return "agent-core";
  if (role === "whatsapp" || role === "whatsapp-ingress" || role === "whatsapp-egress") {
    return "agent-whatsapp";
  }
  return "agent";
}

const runtimeContext = getDefaultRuntimeContext();
const obsEnabled = env.OBS_ENABLED ?? true;
const obsSampleRate = env.OBS_SAMPLE_RATE ?? 1;
const obsLogLevel = env.OBS_LOG_LEVEL ?? "info";
const obsIncludeContent = env.OBS_INCLUDE_CONTENT ?? false;
const prettyOverride = process.env["LOG_PRETTY"];
const isProduction = process.env["NODE_ENV"] === "production";
const isTest = process.env["NODE_ENV"] === "test";
const defaultPretty = process.stdout.isTTY && !isProduction && !isTest;
const usePrettyLogs = prettyOverride === "true" || (prettyOverride !== "false" && defaultPretty);

const service = resolveServiceName();
const baseFields = {
  service,
  env: runtimeContext.env,
  release: runtimeContext.release,
  workerId: env.WORKER_ID,
  runtime: "bun",
};

function createPinoInstance(): PinoLogger {
  const options: LoggerOptions = {
    level: obsLogLevel,
    base: baseFields,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  const streams: DestinationStream[] = [];
  if (usePrettyLogs) {
    try {
      const prettyTarget: TransportTargetOptions = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          messageFormat: "{msg}",
          singleLine: true,
        },
      };
      const prettyTransport = pino.transport(prettyTarget);
      streams.push(prettyTransport as DestinationStream);
    } catch (error) {
      console.error("[observability] Failed to initialize pino-pretty transport:", error);
      streams.push(process.stdout as DestinationStream);
    }
  } else {
    streams.push(process.stdout as DestinationStream);
  }

  const shouldUseAxiomTransport = obsEnabled && Boolean(env.AXIOM_TOKEN && env.AXIOM_DATASET);

  if (shouldUseAxiomTransport) {
    try {
      const target: TransportTargetOptions = {
        target: "@axiomhq/pino",
        options: {
          dataset: env.AXIOM_DATASET,
          token: env.AXIOM_TOKEN,
        },
      };

      const transport = pino.transport(target);
      streams.push(transport as DestinationStream);
    } catch (error) {
      console.error(
        "[observability] Failed to initialize @axiomhq/pino transport, using stdout only:",
        error,
      );
    }
  } else if (obsEnabled && process.env["NODE_ENV"] !== "test") {
    console.warn(
      `[observability] OBS is enabled for '${service}' but AXIOM_TOKEN or AXIOM_DATASET is missing. Using stdout only.`,
    );
  }

  return pino(options, pino.multistream(streams));
}

function buildSampleKey(event: string, payload: EventPayload | undefined) {
  const ids = [
    payload?.["conversationId"],
    payload?.["jobId"],
    payload?.["messageId"],
    payload?.["approvalId"],
    payload?.["accountId"],
    payload?.["workerId"],
  ]
    .filter((value) => value !== undefined)
    .map((value) => String(value));

  return [event, ...ids].join("|");
}

const pinoLogger = createPinoInstance();

function emit(level: LogLevel, event: string, payload?: EventPayload, error?: unknown) {
  const includeContent = obsIncludeContent;
  const sampleKey = buildSampleKey(event, payload);
  const shouldEmit = shouldSample(obsSampleRate, sampleKey);
  if (!shouldEmit) return;

  const normalizedPayload: EventPayload = {
    event,
    ...payload,
  };

  if (error !== undefined) {
    normalizedPayload["error"] =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;
  }

  const safePayload = redactPayload(normalizedPayload, includeContent);
  pinoLogger[level](safePayload, event);
}

export const logger = {
  lineDebug: async (message: string, payload?: EventPayload) => {
    const safePayload = redactPayload(payload ?? {}, obsIncludeContent);
    pinoLogger.debug(safePayload, message);
  },
  lineInfo: async (message: string, payload?: EventPayload) => {
    const safePayload = redactPayload(payload ?? {}, obsIncludeContent);
    pinoLogger.info(safePayload, message);
  },
  lineWarn: async (message: string, payload?: EventPayload) => {
    const safePayload = redactPayload(payload ?? {}, obsIncludeContent);
    pinoLogger.warn(safePayload, message);
  },
  lineError: async (message: string, payload?: EventPayload) => {
    const safePayload = redactPayload(payload ?? {}, obsIncludeContent);
    pinoLogger.error(safePayload, message);
  },
  debug: async (event: string, payload?: EventPayload) => {
    emit("debug", event, payload);
  },
  info: async (event: string, payload?: EventPayload) => {
    emit("info", event, payload);
  },
  warn: async (event: string, payload?: EventPayload) => {
    emit("warn", event, payload);
  },
  error: async (event: string, payload?: EventPayload) => {
    emit("error", event, payload);
  },
  exception: async (event: string, error: unknown, payload?: EventPayload) => {
    emit("error", event, payload, error);
  },
  flush: async () => {
    try {
      pinoLogger.flush();
    } catch {}
  },
};
