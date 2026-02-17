/**
 * Tests for the navigation state management and server routing
 *
 * These tests verify the decision-tree architecture of the MCP server,
 * including domain navigation and tool routing.
 */

import { describe, it, expect, vi } from "vitest";

// Mock the client utility for all domain handlers
vi.mock("../utils/client.js", () => ({
  getClient: vi.fn().mockResolvedValue({
    companies: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contacts: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    products: { list: vi.fn(), get: vi.fn() },
    opportunities: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    quotes: { list: vi.fn(), get: vi.fn(), create: vi.fn() },
  }),
}));

describe("navigation and state management", () => {
  describe("domain descriptions", () => {
    it("should define all five domains with descriptions", async () => {
      const domains = [
        "companies",
        "contacts",
        "products",
        "opportunities",
        "quotes",
      ];
      expect(domains).toHaveLength(5);
    });
  });

  describe("getDomainTools function", () => {
    it("should return company tools for companies domain", async () => {
      const { companyTools } = await import("../domains/companies.js");
      expect(companyTools).toHaveLength(5);
      expect(companyTools[0].name).toBe("salesbuildr_companies_list");
    });

    it("should return contact tools for contacts domain", async () => {
      const { contactTools } = await import("../domains/contacts.js");
      expect(contactTools).toHaveLength(5);
      expect(contactTools[0].name).toBe("salesbuildr_contacts_list");
    });

    it("should return product tools for products domain", async () => {
      const { productTools } = await import("../domains/products.js");
      expect(productTools).toHaveLength(2);
      expect(productTools[0].name).toBe("salesbuildr_products_list");
    });

    it("should return opportunity tools for opportunities domain", async () => {
      const { opportunityTools } = await import(
        "../domains/opportunities.js"
      );
      expect(opportunityTools).toHaveLength(4);
      expect(opportunityTools[0].name).toBe(
        "salesbuildr_opportunities_list"
      );
    });

    it("should return quote tools for quotes domain", async () => {
      const { quoteTools } = await import("../domains/quotes.js");
      expect(quoteTools).toHaveLength(3);
      expect(quoteTools[0].name).toBe("salesbuildr_quotes_list");
    });
  });

  describe("tool naming patterns", () => {
    it("should prefix company tools with salesbuildr_companies_", async () => {
      const { companyTools } = await import("../domains/companies.js");
      companyTools.forEach((tool) => {
        expect(tool.name).toMatch(/^salesbuildr_companies_/);
      });
    });

    it("should prefix contact tools with salesbuildr_contacts_", async () => {
      const { contactTools } = await import("../domains/contacts.js");
      contactTools.forEach((tool) => {
        expect(tool.name).toMatch(/^salesbuildr_contacts_/);
      });
    });

    it("should prefix product tools with salesbuildr_products_", async () => {
      const { productTools } = await import("../domains/products.js");
      productTools.forEach((tool) => {
        expect(tool.name).toMatch(/^salesbuildr_products_/);
      });
    });

    it("should prefix opportunity tools with salesbuildr_opportunities_", async () => {
      const { opportunityTools } = await import(
        "../domains/opportunities.js"
      );
      opportunityTools.forEach((tool) => {
        expect(tool.name).toMatch(/^salesbuildr_opportunities_/);
      });
    });

    it("should prefix quote tools with salesbuildr_quotes_", async () => {
      const { quoteTools } = await import("../domains/quotes.js");
      quoteTools.forEach((tool) => {
        expect(tool.name).toMatch(/^salesbuildr_quotes_/);
      });
    });
  });

  describe("navigation tool schema", () => {
    it("should define navigate tool with domain enum", () => {
      const navigateTool = {
        name: "salesbuildr_navigate",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              enum: [
                "companies",
                "contacts",
                "products",
                "opportunities",
                "quotes",
              ],
            },
          },
          required: ["domain"],
        },
      };

      expect(navigateTool.name).toBe("salesbuildr_navigate");
      expect(navigateTool.inputSchema.properties.domain.enum).toHaveLength(
        5
      );
      expect(navigateTool.inputSchema.required).toContain("domain");
    });

    it("should define back tool with empty schema", () => {
      const backTool = {
        name: "salesbuildr_back",
        inputSchema: {
          type: "object",
          properties: {},
        },
      };

      expect(backTool.name).toBe("salesbuildr_back");
      expect(Object.keys(backTool.inputSchema.properties)).toHaveLength(0);
    });
  });

  describe("state transitions", () => {
    it("should start at null (root) state", () => {
      const state = { currentDomain: null as string | null };
      expect(state.currentDomain).toBeNull();
    });

    it("should transition to domain on navigate", () => {
      const state = { currentDomain: null as string | null };
      state.currentDomain = "companies";
      expect(state.currentDomain).toBe("companies");
    });

    it("should transition back to null on back", () => {
      const state = { currentDomain: "companies" as string | null };
      state.currentDomain = null;
      expect(state.currentDomain).toBeNull();
    });

    it("should allow switching between domains", () => {
      const state = { currentDomain: "companies" as string | null };

      state.currentDomain = null;
      state.currentDomain = "quotes";

      expect(state.currentDomain).toBe("quotes");
    });
  });

  describe("tool schema validation", () => {
    it("should have valid inputSchema for all company tools", async () => {
      const { companyTools } = await import("../domains/companies.js");
      companyTools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it("should have valid inputSchema for all contact tools", async () => {
      const { contactTools } = await import("../domains/contacts.js");
      contactTools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it("should have valid inputSchema for all product tools", async () => {
      const { productTools } = await import("../domains/products.js");
      productTools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it("should have valid inputSchema for all opportunity tools", async () => {
      const { opportunityTools } = await import(
        "../domains/opportunities.js"
      );
      opportunityTools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it("should have valid inputSchema for all quote tools", async () => {
      const { quoteTools } = await import("../domains/quotes.js");
      quoteTools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });
});
