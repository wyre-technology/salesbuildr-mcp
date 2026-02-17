/**
 * Lazy-loaded SalesBuildr client utility
 *
 * Implements lazy loading pattern to defer client instantiation
 * until first use, reducing startup time and memory footprint.
 *
 * Currently uses local type definitions. When @wyre-technology/node-salesbuildr
 * is published, switch the import to use the real package.
 */

import type { SalesbuildrClient } from "./types.js";

let _client: SalesbuildrClient | null = null;

/**
 * Get credentials from environment variables.
 *
 * @throws Error if SALESBUILDR_API_KEY is not set
 * @returns Object containing the API key
 */
export function getCredentials(): { apiKey: string } {
  const apiKey = process.env.SALESBUILDR_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SALESBUILDR_API_KEY environment variable is required. " +
        "Set it to your SalesBuildr API key from your account settings."
    );
  }
  return { apiKey };
}

/**
 * Get or create the SalesBuildr client instance.
 * Uses lazy loading to defer instantiation until first use.
 *
 * When @wyre-technology/node-salesbuildr is available, this will
 * dynamically import and instantiate the real client. Until then,
 * it throws with a helpful message.
 *
 * @throws Error if SALESBUILDR_API_KEY is not set or client package unavailable
 * @returns Promise resolving to the SalesbuildrClient instance
 */
export async function getClient(): Promise<SalesbuildrClient> {
  if (!_client) {
    const creds = getCredentials();

    try {
      // Dynamic import so TypeScript does not error when the package is absent
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageName = "@wyre-technology/node-salesbuildr";
      const mod: Record<string, unknown> = await import(
        /* webpackIgnore: true */ packageName
      );
      const ClientClass = mod.SalesbuildrClient as new (opts: {
        apiKey: string;
      }) => SalesbuildrClient;
      _client = new ClientClass(creds);
    } catch {
      throw new Error(
        "@wyre-technology/node-salesbuildr is not installed. " +
          "Install it with: npm install @wyre-technology/node-salesbuildr"
      );
    }
  }
  return _client;
}

/**
 * Reset the client instance.
 * Used when credentials change (e.g., gateway mode header swap) or in tests.
 */
export function resetClient(): void {
  _client = null;
}
