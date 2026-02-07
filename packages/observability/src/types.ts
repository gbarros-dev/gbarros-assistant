export type LogLevel = "debug" | "info" | "warn" | "error";

export type TelemetryPayload = Record<string, unknown>;

export interface LoggerConfig {
  service: string;
  enabled: boolean;
  token?: string;
  dataset?: string;
  sampleRate?: number;
  endpoint?: string;
  logLevel?: LogLevel;
  includeContent?: boolean;
  environment?: string;
  release?: string;
  staticFields?: TelemetryPayload;
}

export interface BaseLogEvent {
  event: string;
  level: LogLevel;
  service: string;
  timestamp: string;
  env?: string;
  release?: string;
}

export interface Logger {
  debug: (event: string, payload?: TelemetryPayload) => Promise<void>;
  info: (event: string, payload?: TelemetryPayload) => Promise<void>;
  warn: (event: string, payload?: TelemetryPayload) => Promise<void>;
  error: (event: string, payload?: TelemetryPayload) => Promise<void>;
  exception: (event: string, error: unknown, payload?: TelemetryPayload) => Promise<void>;
  flush: () => Promise<void>;
}
