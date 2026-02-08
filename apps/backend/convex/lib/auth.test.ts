import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { isValidServiceKey } from "./auth";

// ─── isValidServiceKey unit tests ──────────────────────────────────────────

describe("isValidServiceKey", () => {
  const ORIGINAL_ENV = process.env.AGENT_SECRET;

  afterEach(() => {
    if (ORIGINAL_ENV !== undefined) {
      process.env.AGENT_SECRET = ORIGINAL_ENV;
    } else {
      delete process.env.AGENT_SECRET;
    }
  });

  it("returns true when AGENT_SECRET is not configured (dev mode)", () => {
    delete process.env.AGENT_SECRET;
    expect(isValidServiceKey()).toBe(true);
    expect(isValidServiceKey("anything")).toBe(true);
    expect(isValidServiceKey(undefined)).toBe(true);
  });

  it("returns true when key matches AGENT_SECRET", () => {
    process.env.AGENT_SECRET = "test-secret-123";
    expect(isValidServiceKey("test-secret-123")).toBe(true);
  });

  it("returns false when key is missing and AGENT_SECRET is set", () => {
    process.env.AGENT_SECRET = "test-secret-123";
    expect(isValidServiceKey()).toBe(false);
    expect(isValidServiceKey(undefined)).toBe(false);
  });

  it("returns false when key does not match AGENT_SECRET", () => {
    process.env.AGENT_SECRET = "test-secret-123";
    expect(isValidServiceKey("wrong-key")).toBe(false);
    expect(isValidServiceKey("")).toBe(false);
  });

  it("returns false for empty string even when AGENT_SECRET is set", () => {
    process.env.AGENT_SECRET = "test-secret-123";
    expect(isValidServiceKey("")).toBe(false);
  });
});

// ─── Auth boundary regression test ─────────────────────────────────────────
//
// This test reads every Convex function file and verifies that all exported
// public queries and mutations contain an auth check. If someone adds a new
// function without auth, this test fails — preventing security regressions.

const AUTH_PATTERNS = [
  "isValidServiceKey(",
  "getAuthUser(",
  "getConversationIfOwner(",
  "getUserIdentity(",
];

/**
 * Functions intentionally exempted from auth requirements.
 * Each entry must have a justification comment.
 */
const ALLOWED_UNAUTHENTICATED: Record<string, string> = {
  // Health check endpoint — must be public for monitoring
  "healthCheck.ts:get": "Public health check endpoint",

  // WhatsApp Baileys session store — agent-only, no user identity
  "whatsappSession.ts:get": "Baileys session store, agent-only by network",
  "whatsappSession.ts:set": "Baileys session store, agent-only by network",
  "whatsappSession.ts:remove": "Baileys session store, agent-only by network",
  "whatsappSession.ts:getAll": "Baileys session store, agent-only by network",
  "whatsappSession.ts:clearAll": "Baileys session store, agent-only by network",

  // Tool approvals polled by agent during approval flow
  "toolApprovals.ts:getPendingByJob": "Agent-only polling by jobId",
  "toolApprovals.ts:getByJob": "Agent-only polling by jobId",

  // Memories — query used by agent for RAG retrieval
  "memories.ts:listByConversation": "Agent-only memory retrieval",
};

/** Parse exported public function names from a Convex file. */
function extractPublicFunctions(source: string): { name: string; body: string }[] {
  const results: { name: string; body: string }[] = [];

  // Match: export const NAME = query|mutation({...handler...})
  // We need to find each export and extract its handler body
  const exportPattern = /export\s+const\s+(\w+)\s*=\s*(query|mutation)\s*\(/g;
  let match;
  while ((match = exportPattern.exec(source)) !== null) {
    const name = match[1]!;
    const startIdx = match.index!;

    // Find the handler body by counting braces from the start of the function call
    let depth = 0;
    let handlerStart = -1;
    let handlerEnd = -1;

    for (let i = startIdx; i < source.length; i++) {
      if (source[i] === "(") {
        depth++;
        if (depth === 1) handlerStart = i;
      } else if (source[i] === ")") {
        depth--;
        if (depth === 0) {
          handlerEnd = i;
          break;
        }
      }
    }

    if (handlerStart !== -1 && handlerEnd !== -1) {
      const body = source.slice(handlerStart, handlerEnd + 1);
      results.push({ name, body });
    }
  }

  return results;
}

describe("auth boundary regression", () => {
  const convexDir = path.resolve(__dirname, "..");
  const SKIP_DIRS = ["_generated", "lib"];
  const SKIP_FILES = ["crons.ts", "http.ts"];

  it("every public query/mutation uses an auth check or is explicitly exempted", () => {
    const files = fs.readdirSync(convexDir).filter((f) => {
      if (!f.endsWith(".ts")) return false;
      if (f.endsWith(".test.ts")) return false;
      if (SKIP_FILES.includes(f)) return false;
      return true;
    });

    // Also check subdirectories (e.g., clerk/)
    const subdirs = fs.readdirSync(convexDir).filter((f) => {
      const stat = fs.statSync(path.join(convexDir, f));
      return stat.isDirectory() && !SKIP_DIRS.includes(f);
    });

    for (const subdir of subdirs) {
      const subFiles = fs
        .readdirSync(path.join(convexDir, subdir))
        .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !SKIP_FILES.includes(f));
      for (const f of subFiles) {
        files.push(path.join(subdir, f));
      }
    }

    const violations: string[] = [];

    for (const file of files) {
      const filePath = path.join(convexDir, file);
      const source = fs.readFileSync(filePath, "utf-8");
      const functions = extractPublicFunctions(source);

      for (const fn of functions) {
        const key = `${path.basename(file)}:${fn.name}`;

        // Skip explicitly exempted functions
        if (key in ALLOWED_UNAUTHENTICATED) continue;

        // Check if handler body contains an auth pattern
        const hasAuth = AUTH_PATTERNS.some((pattern) => fn.body.includes(pattern));

        if (!hasAuth) {
          violations.push(key);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Public functions without auth checks:\n${violations.map((v) => `  - ${v}`).join("\n")}\n\n` +
          "Add an auth check (isValidServiceKey, getAuthUser, getConversationIfOwner, or getUserIdentity) " +
          "or add to ALLOWED_UNAUTHENTICATED with a justification.",
      );
    }
  });

  it("ALLOWED_UNAUTHENTICATED entries still exist in the codebase", () => {
    // Verify that exempted functions haven't been removed — stale allowlist entries
    // indicate the exemption should be cleaned up
    const stale: string[] = [];

    for (const key of Object.keys(ALLOWED_UNAUTHENTICATED)) {
      const [fileName, funcName] = key.split(":");
      const filePath = path.join(convexDir, fileName!);
      if (!fs.existsSync(filePath)) {
        stale.push(`${key} — file not found`);
        continue;
      }
      const source = fs.readFileSync(filePath, "utf-8");
      const functions = extractPublicFunctions(source);
      const found = functions.some((fn) => fn.name === funcName);
      if (!found) {
        stale.push(`${key} — function not found`);
      }
    }

    if (stale.length > 0) {
      throw new Error(
        `Stale ALLOWED_UNAUTHENTICATED entries (remove them):\n${stale.map((s) => `  - ${s}`).join("\n")}`,
      );
    }
  });
});
