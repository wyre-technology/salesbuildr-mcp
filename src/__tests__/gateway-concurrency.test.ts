/**
 * Regression test for the cross-tenant credential leak in gateway mode,
 * driven through the real Cloudflare Workers request path — `worker.fetch()`
 * → `createMcpServer()` → `handleCompanyTool()` → `getClient()` — the same
 * `mcp-server.ts` factory the Node HTTP transport in `index.ts` shares.
 *
 * Before the fix, `worker.ts` (and `index.ts`) called `resetClient()` at the
 * *start* of each request's handler, before `server.connect()` /
 * `transport.handleRequest()` ever awaited anything, while `getClient()`
 * cached the constructed client in a module-level `_client` variable. That
 * reset-at-request-start did not prevent overlap: under concurrent requests,
 * whichever tenant's request reached `getClient()` first populated the
 * shared cache, and any other tenant's request still in flight read that
 * same cached instance instead of building its own — moving the reset
 * earlier just moved the race window, it didn't close it.
 *
 * This test forces genuine interleaving with a deferred / manually-resolved
 * promise (not a timer): tenant A's mocked vendor API call is held open
 * until tenant B's concurrent request has resolved completely end-to-end,
 * reproducing "tenant B's request starts [and, under the old code, resets
 * the shared client cache] while tenant A's connect()/handleRequest() is
 * still in flight." Each response must reflect only its own tenant's data.
 */

import { describe, it, expect, vi } from "vitest";
import worker, { type Env } from "../worker.js";

interface CapturedConfig {
  apiKey: string;
  baseUrl?: string;
}

const { SalesbuildrClientMock } = vi.hoisted(() => ({
  SalesbuildrClientMock: vi.fn(),
}));

vi.mock("@wyre-technology/node-salesbuildr", () => ({
  SalesbuildrClient: SalesbuildrClientMock,
}));

const MCP_HEADERS = {
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

function companiesListRequest(id: number) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    // A non-empty `query` skips the elicitation branch for a missing search term.
    params: { name: "salesbuildr_companies_list", arguments: { query: "acme" } },
  };
}

async function mcp(
  body: unknown,
  headers: Record<string, string>,
  env: Env = { AUTH_MODE: "gateway" }
): Promise<Response> {
  return worker.fetch(
    new Request("http://worker.local/mcp", {
      method: "POST",
      headers: { ...MCP_HEADERS, ...headers },
      body: JSON.stringify(body),
    }),
    env
  );
}

describe("Gateway mode: cross-tenant credential isolation under real concurrency", () => {
  it("resolves each concurrent tenant's own credentials/client, never swapped", async () => {
    // Deferred / manually-resolved promise (not setTimeout): tenant A's
    // mocked vendor call stays pending — genuinely in flight — until
    // released explicitly by tenant B's request completing.
    let releaseA!: () => void;
    const tenantAHeld = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    SalesbuildrClientMock.mockReset();
    SalesbuildrClientMock.mockImplementation(function (config: CapturedConfig) {
      return {
        companies: {
          list: vi.fn().mockImplementation(async () => {
            if (config.apiKey === "tenant-a-key") {
              // Tenant A's vendor call is held open until tenant B's
              // concurrent request has resolved end-to-end — guaranteeing
              // real overlap at exactly the point the old reset-timing bug
              // would have mattered.
              await tenantAHeld;
            }
            return { items: [{ id: "1", name: `company-for-${config.apiKey}` }] };
          }),
        },
      };
    });

    const requestA = mcp(companiesListRequest(1), {
      "x-salesbuildr-api-key": "tenant-a-key",
    });
    const requestB = (async () => {
      const res = await mcp(companiesListRequest(2), {
        "x-salesbuildr-api-key": "tenant-b-key",
      });
      // Only now — after tenant B's whole request/response cycle has
      // resolved — does tenant A's in-flight vendor call get to proceed.
      releaseA();
      return res;
    })();

    const [resA, resB] = await Promise.all([requestA, requestB]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const bodyA = (await resA.json()) as {
      result?: { content?: { text?: string }[] };
    };
    const bodyB = (await resB.json()) as {
      result?: { content?: { text?: string }[] };
    };

    const textA = bodyA.result?.content?.[0]?.text ?? "";
    const textB = bodyB.result?.content?.[0]?.text ?? "";

    // Tenant B's response lands first, fully resolved while tenant A is
    // still in flight. Each response must reflect only its own tenant's
    // data — the load-bearing VALUE assertions, not just "two different
    // responses came back."
    expect(textB).toContain("company-for-tenant-b-key");
    expect(textB).not.toContain("tenant-a-key");

    expect(textA).toContain("company-for-tenant-a-key");
    expect(textA).not.toContain("tenant-b-key");
  });
});
