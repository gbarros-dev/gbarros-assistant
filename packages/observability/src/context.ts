import type { TelemetryPayload } from "./types";

export interface RuntimeContext {
  env?: string;
  release?: string;
  staticFields?: TelemetryPayload;
}

export function getDefaultRuntimeContext(): RuntimeContext {
  const resolvedEnv =
    process.env["OBS_ENV"] ??
    process.env["APP_ENV"] ??
    process.env["VERCEL_ENV"] ??
    process.env["NODE_ENV"] ??
    process.env["BUN_ENV"] ??
    (process.env["CI"] ? "ci" : "development");

  return {
    env: resolvedEnv,
    release:
      process.env["VERCEL_GIT_COMMIT_SHA"] ??
      process.env["RAILWAY_GIT_COMMIT_SHA"] ??
      process.env["RELEASE_SHA"] ??
      undefined,
  };
}
