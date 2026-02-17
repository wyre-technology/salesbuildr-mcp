/**
 * Tests for the products domain tool handlers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { productTools, handleProductTool } from "../../domains/products.js";

// Mock the client utility
const mockClient = {
  products: {
    list: vi.fn(),
    get: vi.fn(),
  },
};

vi.mock("../../utils/client.js", () => ({
  getClient: vi.fn().mockResolvedValue({
    products: {
      list: vi.fn(),
      get: vi.fn(),
    },
  }),
}));

describe("products domain", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getClient } = await import("../../utils/client.js");
    vi.mocked(getClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof getClient>>
    );
  });

  describe("productTools", () => {
    it("should export two product tools", () => {
      expect(productTools).toHaveLength(2);
    });

    it("should have salesbuildr_products_list tool", () => {
      const listTool = productTools.find(
        (t) => t.name === "salesbuildr_products_list"
      );
      expect(listTool).toBeDefined();
      expect(listTool?.inputSchema.properties).toHaveProperty("query");
      expect(listTool?.inputSchema.properties).toHaveProperty("from");
      expect(listTool?.inputSchema.properties).toHaveProperty("size");
      expect(listTool?.inputSchema.required).toBeUndefined();
    });

    it("should have salesbuildr_products_get tool with required id", () => {
      const getTool = productTools.find(
        (t) => t.name === "salesbuildr_products_get"
      );
      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain("id");
    });
  });

  describe("handleProductTool", () => {
    describe("salesbuildr_products_list", () => {
      it("should call client.products.list with search params", async () => {
        const mockResponse = { data: [], total: 0, from: 0, size: 25 };
        mockClient.products.list.mockResolvedValue(mockResponse);

        const result = await handleProductTool(
          "salesbuildr_products_list",
          {
            query: "firewall",
            from: 0,
            size: 10,
          }
        );

        expect(mockClient.products.list).toHaveBeenCalledWith({
          query: "firewall",
          from: 0,
          size: 10,
        });
        expect(result.content[0].text).toContain("data");
        expect(result.isError).toBeUndefined();
      });

      it("should call client.products.list with default params", async () => {
        const mockResponse = { data: [], total: 0, from: 0, size: 25 };
        mockClient.products.list.mockResolvedValue(mockResponse);

        await handleProductTool("salesbuildr_products_list", {});

        expect(mockClient.products.list).toHaveBeenCalledWith({
          query: undefined,
          from: undefined,
          size: undefined,
        });
      });
    });

    describe("salesbuildr_products_get", () => {
      it("should call client.products.get with id", async () => {
        const mockProduct = {
          id: "prod-123",
          name: "FortiGate Firewall",
          price: 999.99,
        };
        mockClient.products.get.mockResolvedValue(mockProduct);

        const result = await handleProductTool("salesbuildr_products_get", {
          id: "prod-123",
        });

        expect(mockClient.products.get).toHaveBeenCalledWith("prod-123");
        expect(result.content[0].text).toContain("FortiGate Firewall");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown product tool", async () => {
        const result = await handleProductTool(
          "salesbuildr_products_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown product tool");
      });
    });
  });
});
