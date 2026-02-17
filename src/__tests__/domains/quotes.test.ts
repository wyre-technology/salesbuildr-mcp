/**
 * Tests for the quotes domain tool handlers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { quoteTools, handleQuoteTool } from "../../domains/quotes.js";

// Mock the client utility
const mockClient = {
  quotes: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("../../utils/client.js", () => ({
  getClient: vi.fn().mockResolvedValue({
    quotes: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
    },
  }),
}));

describe("quotes domain", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getClient } = await import("../../utils/client.js");
    vi.mocked(getClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof getClient>>
    );
  });

  describe("quoteTools", () => {
    it("should export three quote tools", () => {
      expect(quoteTools).toHaveLength(3);
    });

    it("should have salesbuildr_quotes_list tool", () => {
      const listTool = quoteTools.find(
        (t) => t.name === "salesbuildr_quotes_list"
      );
      expect(listTool).toBeDefined();
      expect(listTool?.inputSchema.properties).toHaveProperty("query");
      expect(listTool?.inputSchema.properties).toHaveProperty("companyId");
      expect(listTool?.inputSchema.properties).toHaveProperty(
        "opportunityId"
      );
      expect(listTool?.inputSchema.properties).toHaveProperty("from");
      expect(listTool?.inputSchema.properties).toHaveProperty("size");
    });

    it("should have salesbuildr_quotes_get tool with required id", () => {
      const getTool = quoteTools.find(
        (t) => t.name === "salesbuildr_quotes_get"
      );
      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain("id");
    });

    it("should have salesbuildr_quotes_create tool with required title", () => {
      const createTool = quoteTools.find(
        (t) => t.name === "salesbuildr_quotes_create"
      );
      expect(createTool).toBeDefined();
      expect(createTool?.inputSchema.properties).toHaveProperty("title");
      expect(createTool?.inputSchema.properties).toHaveProperty("companyId");
      expect(createTool?.inputSchema.properties).toHaveProperty("contactId");
      expect(createTool?.inputSchema.properties).toHaveProperty(
        "opportunityId"
      );
      expect(createTool?.inputSchema.properties).toHaveProperty("items");
      expect(createTool?.inputSchema.required).toContain("title");
    });

    it("should define items as array with correct schema", () => {
      const createTool = quoteTools.find(
        (t) => t.name === "salesbuildr_quotes_create"
      );
      const items = createTool?.inputSchema.properties?.items as Record<
        string,
        unknown
      >;
      expect(items).toBeDefined();
      expect(items?.type).toBe("array");
      const itemSchema = items?.items as Record<string, unknown>;
      expect(itemSchema?.type).toBe("object");
      const itemProps = itemSchema?.properties as Record<string, unknown>;
      expect(itemProps).toHaveProperty("name");
      expect(itemProps).toHaveProperty("quantity");
      expect(itemProps).toHaveProperty("unitPrice");
      expect(itemSchema?.required).toContain("name");
      expect(itemSchema?.required).toContain("quantity");
      expect(itemSchema?.required).toContain("unitPrice");
    });
  });

  describe("handleQuoteTool", () => {
    describe("salesbuildr_quotes_list", () => {
      it("should call client.quotes.list with params", async () => {
        const mockResponse = { data: [], total: 0, from: 0, size: 25 };
        mockClient.quotes.list.mockResolvedValue(mockResponse);

        const result = await handleQuoteTool("salesbuildr_quotes_list", {
          query: "proposal",
          companyId: "comp-123",
          opportunityId: "opp-456",
          from: 0,
          size: 10,
        });

        expect(mockClient.quotes.list).toHaveBeenCalledWith({
          query: "proposal",
          companyId: "comp-123",
          opportunityId: "opp-456",
          from: 0,
          size: 10,
        });
        expect(result.content[0].text).toContain("data");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_quotes_get", () => {
      it("should call client.quotes.get with id", async () => {
        const mockQuote = {
          id: "qt-123",
          title: "Managed Services Proposal",
          total: 5000,
        };
        mockClient.quotes.get.mockResolvedValue(mockQuote);

        const result = await handleQuoteTool("salesbuildr_quotes_get", {
          id: "qt-123",
        });

        expect(mockClient.quotes.get).toHaveBeenCalledWith("qt-123");
        expect(result.content[0].text).toContain(
          "Managed Services Proposal"
        );
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_quotes_create", () => {
      it("should call client.quotes.create with quote data", async () => {
        const mockQuote = {
          id: "qt-456",
          title: "New Quote",
          total: 1500,
        };
        mockClient.quotes.create.mockResolvedValue(mockQuote);

        const result = await handleQuoteTool("salesbuildr_quotes_create", {
          title: "New Quote",
          companyId: "comp-123",
          contactId: "ct-456",
          items: [
            {
              name: "Firewall",
              quantity: 1,
              unitPrice: 999,
            },
            {
              name: "Setup Fee",
              quantity: 1,
              unitPrice: 501,
            },
          ],
        });

        expect(mockClient.quotes.create).toHaveBeenCalledWith({
          title: "New Quote",
          companyId: "comp-123",
          contactId: "ct-456",
          items: [
            { name: "Firewall", quantity: 1, unitPrice: 999 },
            { name: "Setup Fee", quantity: 1, unitPrice: 501 },
          ],
        });
        expect(result.content[0].text).toContain("New Quote");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown quote tool", async () => {
        const result = await handleQuoteTool(
          "salesbuildr_quotes_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown quote tool");
      });
    });
  });
});
