/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as agents from "../agents.js";
import type * as clerk_http from "../clerk/http.js";
import type * as clerk_sync from "../clerk/sync.js";
import type * as clerk_webhooks from "../clerk/webhooks.js";
import type * as contacts from "../contacts.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as memories from "../memories.js";
import type * as messages from "../messages.js";
import type * as privateData from "../privateData.js";
import type * as scheduledTasks from "../scheduledTasks.js";
import type * as skills from "../skills.js";
import type * as toolApprovals from "../toolApprovals.js";
import type * as users from "../users.js";
import type * as whatsappSession from "../whatsappSession.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  agents: typeof agents;
  "clerk/http": typeof clerk_http;
  "clerk/sync": typeof clerk_sync;
  "clerk/webhooks": typeof clerk_webhooks;
  contacts: typeof contacts;
  conversations: typeof conversations;
  crons: typeof crons;
  healthCheck: typeof healthCheck;
  http: typeof http;
  memories: typeof memories;
  messages: typeof messages;
  privateData: typeof privateData;
  scheduledTasks: typeof scheduledTasks;
  skills: typeof skills;
  toolApprovals: typeof toolApprovals;
  users: typeof users;
  whatsappSession: typeof whatsappSession;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
