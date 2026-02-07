import type { PluginManifest } from "./types";

/** Serialize manifest for Convex storage (the manifest field in pluginDefinitions). */
export function serializeManifest(manifest: PluginManifest): Record<string, unknown> {
  return { ...manifest };
}
