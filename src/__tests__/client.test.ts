/**
 * Tests for the SalesBuildr client utility — lazy env-mode singleton, plus
 * per-request (gateway mode) credential/client isolation.
 *
 * Regression coverage for the cross-tenant credential leak: getClient()
 * previously cached the constructed client in a module-level `_client`
 * variable regardless of whether the credentials came from the per-request
 * AsyncLocalStorage store (gateway mode) or process.env (stdio/env mode).
 * Callers reset that cache via resetClient() at the *start* of each HTTP
 * request handler (worker.ts / index.ts), before
 * server.connect()/transport.handleRequest() actually awaited anything — so
 * the reset did not prevent overlap. Under concurrent requests, whichever
 * tenant's request reached getClient() first populated the shared
 * singleton, and any other tenant's request still in flight read that same
 * cached instance instead of building its own.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { credentialStore } from "../utils/credential-store.js";

const { SalesbuildrClientMock } = vi.hoisted(() => ({
  SalesbuildrClientMock: vi.fn(),
}));

vi.mock("@wyre-technology/node-salesbuildr", () => ({
  SalesbuildrClient: SalesbuildrClientMock,
}));

import { getClient, resetClient } from "../utils/client.js";

describe("client utility", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SALESBUILDR_API_KEY;
    delete process.env.SALESBUILDR_BASE_URL;
    resetClient();

    SalesbuildrClientMock.mockReset();
    SalesbuildrClientMock.mockImplementation(function (config: {
      apiKey: string;
      baseUrl?: string;
    }) {
      return { config };
    });
  });

  describe("env-mode singleton (stdio / non-gateway HTTP)", () => {
    it("builds a client from environment variables and caches it", async () => {
      process.env.SALESBUILDR_API_KEY = "env-key";

      const client1 = await getClient();
      const client2 = await getClient();

      expect(client1).toBe(client2);
      expect(SalesbuildrClientMock).toHaveBeenCalledTimes(1);
    });

    it("throws when no API key is available from any source", async () => {
      await expect(getClient()).rejects.toThrow(/SALESBUILDR_API_KEY/);
    });

    it("rebuilds after resetClient()", async () => {
      process.env.SALESBUILDR_API_KEY = "env-key";
      const client1 = await getClient();
      resetClient();
      const client2 = await getClient();

      expect(client1).not.toBe(client2);
      expect(SalesbuildrClientMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("gateway credential isolation — regression for the module-level _client singleton", () => {
    it(
      "does not let a concurrent tenant's request populate a cache that a still-in-flight tenant then reads " +
        "(deterministic interleave via a manually-resolved deferred, not a timer)",
      async () => {
        const credsA = {
          apiKey: "tenant-a-key",
          baseUrl: "https://a.example.com",
        };
        const credsB = {
          apiKey: "tenant-b-key",
          baseUrl: "https://b.example.com",
        };

        // Deferred / manually-resolved promise (not setTimeout): tenant A's
        // request has already entered its AsyncLocalStorage scope — exactly
        // as it would right after credentialStore.run() starts it — and
        // pauses immediately before calling getClient(). This reproduces the
        // moment where, under the old implementation, tenant A's
        // connect()/handleRequest() was still in flight while a concurrent
        // tenant's request-start reset had already fired.
        let releaseA!: () => void;
        const tenantAIsPaused = new Promise<void>((resolve) => {
          releaseA = resolve;
        });

        const runA = credentialStore.run(credsA, async () => {
          await tenantAIsPaused;
          return getClient();
        });

        const runB = credentialStore.run(credsB, async () => {
          // Tenant B's entire request — including its own getClient() call,
          // exactly where the old code would repopulate the shared _client
          // singleton — runs and fully resolves BEFORE tenant A is allowed
          // to resume and make its own getClient() call.
          const client = await getClient();
          releaseA();
          return client;
        });

        const [clientA, clientB] = await Promise.all([runA, runB]);

        // Distinctness alone is not sufficient evidence — a reintroduced
        // shared singleton could still yield two distinct-looking
        // references depending on ordering. The load-bearing checks are the
        // per-variable VALUE assertions below: clientA must carry tenant
        // A's own credentials, never tenant B's, and vice versa.
        expect(clientA).not.toBe(clientB);
        expect(clientA).toMatchObject({ config: credsA });
        expect(clientB).toMatchObject({ config: credsB });
      }
    );

    it("builds a fresh, uncached client on every gateway-scoped call — never populates the env-mode singleton", async () => {
      const creds = {
        apiKey: "gateway-key",
        baseUrl: "https://gw.example.com",
      };

      const [first, second] = await credentialStore.run(creds, () =>
        Promise.all([getClient(), getClient()])
      );

      expect(first).not.toBe(second);
      expect(SalesbuildrClientMock).toHaveBeenCalledTimes(2);

      // A later non-scoped (env-mode) call must not observe anything built
      // for the gateway-scoped tenant above — proves gateway credentials
      // never leak into the env-mode cache.
      process.env.SALESBUILDR_API_KEY = "env-key";
      const envClient = await getClient();

      expect(envClient).not.toBe(first);
      expect(envClient).not.toBe(second);
      expect(envClient).toMatchObject({ config: { apiKey: "env-key" } });
    });
  });
});
