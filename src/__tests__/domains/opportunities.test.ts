/**
 * Tests for the opportunities domain tool handlers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  opportunityTools,
  handleOpportunityTool,
} from "../../domains/opportunities.js";

// Mock the client utility
const mockClient = {
  opportunities: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("../../utils/client.js", () => ({
  getClient: vi.fn().mockResolvedValue({
    opportunities: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  }),
}));

describe("opportunities domain", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getClient } = await import("../../utils/client.js");
    vi.mocked(getClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof getClient>>
    );
  });

  describe("opportunityTools", () => {
    it("should export four opportunity tools", () => {
      expect(opportunityTools).toHaveLength(4);
    });

    it("should have salesbuildr_opportunities_list tool", () => {
      const listTool = opportunityTools.find(
        (t) => t.name === "salesbuildr_opportunities_list"
      );
      expect(listTool).toBeDefined();
      expect(listTool?.inputSchema.properties).toHaveProperty("query");
      expect(listTool?.inputSchema.properties).toHaveProperty("from");
      expect(listTool?.inputSchema.properties).toHaveProperty("size");
    });

    it("should have salesbuildr_opportunities_get tool with required id", () => {
      const getTool = opportunityTools.find(
        (t) => t.name === "salesbuildr_opportunities_get"
      );
      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain("id");
    });

    it("should have salesbuildr_opportunities_create tool with required title", () => {
      const createTool = opportunityTools.find(
        (t) => t.name === "salesbuildr_opportunities_create"
      );
      expect(createTool).toBeDefined();
      expect(createTool?.inputSchema.properties).toHaveProperty("title");
      expect(createTool?.inputSchema.properties).toHaveProperty("value");
      expect(createTool?.inputSchema.properties).toHaveProperty("stage");
      expect(createTool?.inputSchema.properties).toHaveProperty(
        "probability"
      );
      expect(createTool?.inputSchema.required).toContain("title");
    });

    it("should have salesbuildr_opportunities_update tool with required id", () => {
      const updateTool = opportunityTools.find(
        (t) => t.name === "salesbuildr_opportunities_update"
      );
      expect(updateTool).toBeDefined();
      expect(updateTool?.inputSchema.required).toContain("id");
    });
  });

  describe("handleOpportunityTool", () => {
    describe("salesbuildr_opportunities_list", () => {
      it("should call client.opportunities.list with params", async () => {
        const mockResponse = { data: [], total: 0, from: 0, size: 25 };
        mockClient.opportunities.list.mockResolvedValue(mockResponse);

        const result = await handleOpportunityTool(
          "salesbuildr_opportunities_list",
          {
            query: "enterprise",
            from: 0,
            size: 20,
          }
        );

        expect(mockClient.opportunities.list).toHaveBeenCalledWith({
          query: "enterprise",
          from: 0,
          size: 20,
        });
        expect(result.content[0].text).toContain("data");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_opportunities_get", () => {
      it("should call client.opportunities.get with id", async () => {
        const mockOpp = {
          id: "opp-123",
          title: "Enterprise Deal",
          value: 50000,
        };
        mockClient.opportunities.get.mockResolvedValue(mockOpp);

        const result = await handleOpportunityTool(
          "salesbuildr_opportunities_get",
          { id: "opp-123" }
        );

        expect(mockClient.opportunities.get).toHaveBeenCalledWith("opp-123");
        expect(result.content[0].text).toContain("Enterprise Deal");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_opportunities_create", () => {
      it("should call client.opportunities.create with data", async () => {
        const mockOpp = {
          id: "opp-456",
          title: "New Deal",
          value: 25000,
          stage: "prospecting",
        };
        mockClient.opportunities.create.mockResolvedValue(mockOpp);

        const result = await handleOpportunityTool(
          "salesbuildr_opportunities_create",
          {
            title: "New Deal",
            value: 25000,
            stage: "prospecting",
            companyId: "comp-123",
          }
        );

        expect(mockClient.opportunities.create).toHaveBeenCalledWith({
          title: "New Deal",
          value: 25000,
          stage: "prospecting",
          companyId: "comp-123",
        });
        expect(result.content[0].text).toContain("New Deal");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_opportunities_update", () => {
      it("should call client.opportunities.update with id and data", async () => {
        const mockOpp = {
          id: "opp-123",
          title: "Enterprise Deal",
          stage: "negotiation",
        };
        mockClient.opportunities.update.mockResolvedValue(mockOpp);

        const result = await handleOpportunityTool(
          "salesbuildr_opportunities_update",
          {
            id: "opp-123",
            stage: "negotiation",
            probability: 75,
          }
        );

        expect(mockClient.opportunities.update).toHaveBeenCalledWith(
          "opp-123",
          { stage: "negotiation", probability: 75 }
        );
        expect(result.content[0].text).toContain("negotiation");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown opportunity tool", async () => {
        const result = await handleOpportunityTool(
          "salesbuildr_opportunities_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown opportunity tool");
      });
    });
  });
});
