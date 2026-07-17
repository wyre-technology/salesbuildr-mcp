/**
 * MCP Apps (SEP-1865) contract tests — mirrors the checks an MCP Apps host
 * performs to render the quote card:
 *   1. the renderable tool advertises the UI resource via _meta (wire-level,
 *      through the Workers entrypoint, which serves the same createMcpServer()
 *      factory as stdio / Node HTTP)
 *   2. the ui:// resource lists and reads back as profile=mcp-app HTML
 *   3. buildQuoteCard normalizes a SalesBuildr quote into the card payload
 *      the iframe renders from, best-effort (a failure never breaks the tool)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import worker from "../worker.js";
import { handleQuoteTool } from "../domains/quotes.js";
import { listResources, readResource } from "../resources.js";
import {
  buildQuoteCard,
  applyBrandInjection,
  QUOTE_CARD_RESOURCE_URI,
  MCP_APP_RESOURCE_MIME,
} from "../card.builder.js";
import { QUOTE_CARD_HTML } from "../generated/quote-card-html.js";

const RENDERABLE_TOOLS = ["salesbuildr_quotes_get"];

// Mock the client utility so handleQuoteTool tests run without credentials.
// worker.ts only needs resetClient from this module for the wire-level tests.
const mockClient = {
  quotes: { list: vi.fn(), get: vi.fn(), create: vi.fn() },
  companies: { get: vi.fn() },
};

vi.mock("../utils/client.js", () => ({
  getClient: vi.fn(),
  getCredentials: vi.fn(),
  resetClient: vi.fn(),
}));

const MCP_HEADERS = {
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

async function mcp(body: unknown): Promise<Response> {
  return worker.fetch(
    new Request("http://worker.local/mcp", {
      method: "POST",
      headers: MCP_HEADERS,
      body: JSON.stringify(body),
    }),
    {}
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { getClient } = await import("../utils/client.js");
  vi.mocked(getClient).mockResolvedValue(
    mockClient as unknown as Awaited<ReturnType<typeof getClient>>
  );
});

describe("MCP Apps quote card", () => {
  describe("tool _meta advertisement (wire-level)", () => {
    async function listTools(): Promise<
      Array<{ name: string; _meta?: Record<string, unknown> }>
    > {
      const res = await mcp({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        result?: { tools?: Array<{ name: string; _meta?: Record<string, unknown> }> };
      };
      return body.result?.tools ?? [];
    }

    it.each(RENDERABLE_TOOLS)("%s links the card via _meta", async (name) => {
      const tool = (await listTools()).find((t) => t.name === name);
      expect(tool).toBeDefined();
      // Canonical flat key (ext-apps RESOURCE_URI_META_KEY) …
      expect(tool?._meta?.["ui/resourceUri"]).toBe(QUOTE_CARD_RESOURCE_URI);
      // … and the nested form registerAppTool also emits.
      expect((tool?._meta?.ui as { resourceUri?: string })?.resourceUri).toBe(
        QUOTE_CARD_RESOURCE_URI
      );
    });

    it("no other tools carry UI metadata", async () => {
      const others = (await listTools()).filter(
        (t) => t._meta && !RENDERABLE_TOOLS.includes(t.name)
      );
      expect(others).toEqual([]);
    });
  });

  describe("ui:// resource", () => {
    it("is listed over the wire with the MCP Apps MIME type", async () => {
      const res = await mcp({ jsonrpc: "2.0", id: 2, method: "resources/list", params: {} });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        result?: { resources?: Array<{ uri: string; mimeType?: string }> };
      };
      const card = body.result?.resources?.find((r) => r.uri === QUOTE_CARD_RESOURCE_URI);
      expect(card?.mimeType).toBe(MCP_APP_RESOURCE_MIME);
    });

    it("reads back over the wire as profile=mcp-app HTML", async () => {
      const res = await mcp({
        jsonrpc: "2.0",
        id: 3,
        method: "resources/read",
        params: { uri: QUOTE_CARD_RESOURCE_URI },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        result?: { contents?: Array<{ mimeType?: string; text?: string }> };
      };
      const content = body.result?.contents?.[0];
      expect(content?.mimeType).toBe(MCP_APP_RESOURCE_MIME);
      expect(content?.text).toContain("card__bar");
    });

    it("reads back the embedded bundle byte-identical when no brand is set", () => {
      const content = readResource(QUOTE_CARD_RESOURCE_URI);
      expect(content.mimeType).toBe(MCP_APP_RESOURCE_MIME);
      // No MCP_BRAND_* env set → the embedded HTML is served byte-identical.
      expect(content.text).toBe(QUOTE_CARD_HTML);
      expect(content.text).toContain("BRAND_INJECT");
      // The vite build must have inlined the bridge script — a bare <script src>
      // would be unloadable from a resources/read HTML string.
      expect(content.text).not.toContain('src="./quote-card.ts"');
    });

    it("serves neutral defaults with no vendor identity or external fetches", () => {
      const { text } = readResource(QUOTE_CARD_RESOURCE_URI);
      expect(text).not.toMatch(/WYRE/i);
      expect(text).not.toContain("00c9db"); // WYRE cyan
      expect(text).not.toContain("ede947"); // WYRE yellow
      expect(text).not.toContain("fonts.googleapis.com"); // no external fetches
    });

    it("injects MCP_BRAND_* env vars into the served HTML", () => {
      vi.stubEnv("MCP_BRAND_NAME", "Acme MSP");
      vi.stubEnv("MCP_BRAND_PRIMARY_COLOR", "#ff0000");
      try {
        const { text } = readResource(QUOTE_CARD_RESOURCE_URI);
        expect(text).toContain(
          '<script>window.__BRAND__={"name":"Acme MSP","primaryColor":"#ff0000"}</script>'
        );
        expect(text).not.toContain("BRAND_INJECT");
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("rejects unknown resource URIs", () => {
      expect(() => readResource("ui://salesbuildr/nope.html")).toThrow(/Unknown resource/);
    });

    it("lists exactly one resource", () => {
      expect(listResources()).toHaveLength(1);
    });
  });

  describe("applyBrandInjection", () => {
    const html = QUOTE_CARD_HTML;

    it("replaces the marker with an inline window.__BRAND__ script", () => {
      const out = applyBrandInjection(html, { name: "Acme", primaryColor: "#123456" });
      expect(out).toContain('window.__BRAND__={"name":"Acme","primaryColor":"#123456"}');
      expect(out).not.toContain("BRAND_INJECT");
    });

    it("escapes < so brand values cannot break out of the script tag", () => {
      const out = applyBrandInjection(html, { name: "</script><script>alert(1)" });
      expect(out).not.toContain("</script><script>alert(1)");
      expect(out).toContain("\\u003c/script>\\u003cscript>alert(1)");
    });

    it("returns the HTML unchanged for an empty brand", () => {
      expect(applyBrandInjection(html, {})).toBe(html);
      expect(applyBrandInjection(html, { name: "" })).toBe(html);
    });
  });

  describe("buildQuoteCard", () => {
    const quote = {
      id: "q-2201",
      title: "Managed IT — Acme Corp renewal",
      companyId: "c-12",
      companyName: "Acme Corp",
      contactId: "p-4",
      contactName: "Dana Ruiz",
      status: "sent",
      expiresAt: "2026-08-01",
      createdAt: "2026-07-15T09:00:00Z",
      subtotal: 1450,
      total: 1595.5,
      items: [
        { productName: "Microsoft 365 Business Premium", quantity: 25, unitPrice: 22, total: 550, recurringInterval: "monthly" },
        { name: "Onboarding (one-off)", quantity: 1, unitPrice: 900, total: 900 },
      ],
    };

    const client = { companies: { get: vi.fn(async () => ({ id: "c-12", name: "Acme Corp" })) } };

    it("normalizes labels, amounts, and line items into the card payload", async () => {
      const card = await buildQuoteCard(quote, client as never);
      expect(card).toMatchObject({
        id: "q-2201",
        title: "Managed IT — Acme Corp renewal",
        status: "sent",
        company: "Acme Corp",
        contact: "Dana Ruiz",
        subtotal: 1450,
        total: 1595.5,
        expiresAt: "2026-08-01",
        createdAt: "2026-07-15T09:00:00Z",
        items: [
          { name: "Microsoft 365 Business Premium", quantity: 25, unitPrice: 22, total: 550, recurring: "monthly" },
          { name: "Onboarding (one-off)", quantity: 1, unitPrice: 900, total: 900 },
        ],
      });
      // Resolved names on the payload mean no lookup was needed.
      expect(client.companies.get).not.toHaveBeenCalled();
    });

    it("resolves a missing company name with one best-effort lookup", async () => {
      const { companyName: _companyName, ...bare } = quote;
      const card = await buildQuoteCard(bare, client as never);
      expect(client.companies.get).toHaveBeenCalledWith("c-12");
      expect(card?.company).toBe("Acme Corp");
    });

    it("falls back to #id labels when the lookup fails (best-effort)", async () => {
      const failing = {
        companies: {
          get: vi.fn(async () => {
            throw new Error("SalesBuildr 500");
          }),
        },
      };
      const { companyName: _companyName, contactName: _contactName, ...bare } = quote;
      const card = await buildQuoteCard(bare, failing as never);
      expect(card?.company).toBe("#c-12");
      expect(card?.contact).toBe("#p-4");
      // The rest of the card still renders.
      expect(card?.status).toBe("sent");
    });

    it("accepts the validUntil alias for the expiry date", async () => {
      const card = await buildQuoteCard(
        { id: "q-1", title: "T", validUntil: "2026-09-30" },
        client as never
      );
      expect(card?.expiresAt).toBe("2026-09-30");
    });

    it("truncates long item lists and names, reporting the full count", async () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        name: `Item ${i} ${"x".repeat(300)}`,
        quantity: 1,
        unitPrice: 10,
      }));
      const card = await buildQuoteCard({ id: "q-1", title: "T", items }, client as never);
      expect(card?.items).toHaveLength(8);
      expect(card?.itemCount).toBe(12);
      expect(card?.items[0].name).toHaveLength(200);
    });

    it("drops malformed line items instead of failing", async () => {
      const card = await buildQuoteCard(
        {
          id: "q-1",
          title: "T",
          items: [null, { name: "no price", quantity: 1 }, { quantity: 1, unitPrice: 5 }, { name: "ok", quantity: 2, unitPrice: 5 }],
        },
        client as never
      );
      expect(card?.items).toEqual([{ name: "ok", quantity: 2, unitPrice: 5 }]);
    });

    it("returns null for payloads that are not a quote", async () => {
      expect(await buildQuoteCard({ id: "q-1" }, client as never)).toBeNull();
      expect(await buildQuoteCard({ title: "no id" }, client as never)).toBeNull();
      expect(await buildQuoteCard({}, client as never)).toBeNull();
    });
  });

  describe("salesbuildr_quotes_get handler", () => {
    it("attaches the normalized _card to the tool result", async () => {
      mockClient.quotes.get.mockResolvedValue({
        id: "q-9",
        title: "Firewall refresh",
        companyName: "Globex",
        status: "draft",
      });
      const result = await handleQuoteTool("salesbuildr_quotes_get", { id: "q-9" });
      const payload = JSON.parse(result.content[0].text);
      expect(payload._card).toMatchObject({
        id: "q-9",
        title: "Firewall refresh",
        company: "Globex",
        status: "draft",
      });
      // The model-visible payload is otherwise unchanged.
      expect(payload.title).toBe("Firewall refresh");
      expect(result.isError).toBeUndefined();
    });

    it("drops the card (not the result) when the payload is not renderable", async () => {
      mockClient.quotes.get.mockResolvedValue({ notAQuote: true });
      const result = await handleQuoteTool("salesbuildr_quotes_get", { id: "q-9" });
      const payload = JSON.parse(result.content[0].text);
      expect(payload._card).toBeUndefined();
      expect(payload.notAQuote).toBe(true);
      expect(result.isError).toBeUndefined();
    });
  });
});
