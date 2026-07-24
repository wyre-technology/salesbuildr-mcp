/**
 * Lazy-loaded SalesBuildr client utility
 *
 * Implements lazy loading pattern to defer client instantiation
 * until first use, reducing startup time and memory footprint.
 *
 * The runtime client class is imported statically from the (now published)
 * @wyre-technology/node-salesbuildr package, a required dependency; the
 * hand-written `SalesbuildrClient` interface in `./types.js` remains the type
 * used throughout this codebase, since it keeps domain-handler tests free to
 * mock `getClient()` with plain object literals instead of instances of the
 * real class. (Import used to be a dynamic `await import()`, guarded by a
 * try/catch, from back when the package wasn't published yet. A dynamic
 * import of a module that is also `vi.mock()`-intercepted can race under
 * concurrency and resolve to the real, un-mocked module for one of two
 * concurrent calls — the same flake class already hit and fixed this way in
 * ninjaone-mcp and other sibling repos this week. A static import always
 * resolves through the mocked binding in tests; Node's real dynamic
 * `import()` is cache-deduped in production, so this was a test-only
 * concern, not a behavior change.)
 *
 * Per-request credential isolation (gateway mode) is handled by the
 * AsyncLocalStorage-backed `credentialStore` in `./credential-store.js`.
 * getClient() checks that store on every call: when request-scoped
 * credentials are present, it builds and returns a fresh, uncached client
 * directly from them via createClientDirect() — it never reads from or
 * writes to the module-level `_client` singleton below. That singleton is
 * only a lazy cache for the stdio / env-mode path, where credentials come
 * from process.env and are fixed for the lifetime of the process (a single
 * tenant, so there's nothing to race).
 *
 * (A prior version of this fix cached the request-scoped client the same
 * way as the env-mode singleton and relied on callers resetting it via
 * resetClient() at the top of each HTTP request handler, before
 * server.connect()/transport.handleRequest() actually awaited anything.
 * That reset-at-request-start didn't prevent overlap: under concurrent
 * requests, whichever tenant's request reached getClient() first populated
 * the shared `_client`, and any other tenant's request still in flight
 * would read that same cached instance instead of building its own —
 * moving the reset earlier just moved the race window, it didn't close it.
 * Never caching request-scoped clients removes the race structurally
 * instead of depending on reset ordering.)
 */

import { SalesbuildrClient as SalesbuildrClientImpl } from "@wyre-technology/node-salesbuildr";
import type { SalesbuildrClient } from "./types.js";
import {
  getRequestCredentials,
  type RequestCredentials,
} from "./credential-store.js";

let _client: SalesbuildrClient | null = null;

/**
 * Get credentials from the per-request store (gateway mode) or
 * environment variables (stdio / env mode).
 *
 * @throws Error if no API key is available from either source
 * @returns Object containing the API key and optional base URL
 */
export function getCredentials(): RequestCredentials {
  // Per-request credentials take priority (gateway HTTP mode)
  const reqCreds = getRequestCredentials();
  if (reqCreds) {
    return reqCreds;
  }

  // Fall back to environment variables (stdio or env-mode HTTP)
  const apiKey = process.env.SALESBUILDR_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SALESBUILDR_API_KEY environment variable is required. " +
        "Set it to your SalesBuildr API key from your account settings."
    );
  }
  const baseUrl = process.env.SALESBUILDR_BASE_URL;
  return { apiKey, ...(baseUrl ? { baseUrl } : {}) };
}

/**
 * Construct a fresh SalesbuildrClient directly from the given credentials.
 * Never caches — safe to call concurrently for different tenants, since
 * each call is fully independent of every other.
 */
export async function createClientDirect(
  creds: RequestCredentials
): Promise<SalesbuildrClient> {
  // The hand-written `SalesbuildrClient` interface in `./types.js` predates
  // the real package's publication and has drifted from its actual response
  // shapes (e.g. list() envelopes: `{ results, total }` in the real package
  // vs `{ data, total, from, size }` here) — pre-existing, unrelated to this
  // fix, and out of scope for it. This cast is the single adapter boundary
  // between the real implementation and that local type; every other file
  // in this codebase (including all domain-handler tests) continues to
  // depend only on the local structural type, unaffected by this drift.
  return new SalesbuildrClientImpl(creds) as unknown as SalesbuildrClient;
}

/**
 * Get or create the SalesBuildr client instance.
 *
 * When request-scoped credentials are present (gateway mode, via the
 * AsyncLocalStorage-backed credentialStore), always builds a fresh client
 * directly from them — no caching, so concurrent requests for different
 * tenants can never observe each other's client no matter how their async
 * work interleaves. Otherwise (stdio / env mode) falls back to a
 * lazy-loaded singleton built from process.env, since that path has a
 * single process-lifetime credential set and no concurrent tenants to race.
 *
 * @throws Error if SALESBUILDR_API_KEY is not set (env mode)
 * @returns Promise resolving to the SalesbuildrClient instance
 */
export async function getClient(): Promise<SalesbuildrClient> {
  const reqCreds = getRequestCredentials();
  if (reqCreds) {
    return createClientDirect(reqCreds);
  }

  if (!_client) {
    _client = await createClientDirect(getCredentials());
  }
  return _client;
}

/**
 * Reset the cached env-mode client instance. Used in tests to clear state
 * between cases. No longer called from production request handlers:
 * gateway-mode requests always build a fresh client (see getClient() above)
 * and never populate this cache, so there is nothing request-scoped left
 * to reset.
 */
export function resetClient(): void {
  _client = null;
}
