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
import type * as contacts from "../contacts.js";
import type * as conversations from "../conversations.js";
import type * as healthCheck from "../healthCheck.js";
import type * as messages from "../messages.js";
import type * as privateData from "../privateData.js";
import type * as skills from "../skills.js";
import type * as whatsappSession from "../whatsappSession.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  contacts: typeof contacts;
  conversations: typeof conversations;
  healthCheck: typeof healthCheck;
  messages: typeof messages;
  privateData: typeof privateData;
  skills: typeof skills;
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
