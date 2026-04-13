/**
 * Per-request credential isolation using AsyncLocalStorage.
 *
 * In gateway (HTTP) mode, each inbound request carries its own credentials
 * in headers. Instead of mutating process.env (which is shared across all
 * concurrent requests), we store credentials in AsyncLocalStorage so each
 * request handler sees only its own values.
 *
 * Usage:
 *   - HTTP handler: wrap the request in `credentialStore.run({ apiKey }, fn)`
 *   - Client code: call `getRequestCredentials()` first; fall back to env vars
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestCredentials {
  apiKey: string;
  baseUrl?: string;
}

export const credentialStore = new AsyncLocalStorage<RequestCredentials>();

/**
 * Get credentials from the current request context (AsyncLocalStorage).
 * Returns undefined when called outside an active store.run() scope
 * (e.g. stdio transport or env-mode HTTP).
 */
export function getRequestCredentials(): RequestCredentials | undefined {
  return credentialStore.getStore();
}
