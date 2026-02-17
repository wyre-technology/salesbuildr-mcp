/**
 * Tests for the companies domain tool handlers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { companyTools, handleCompanyTool } from "../../domains/companies.js";

// Mock the client utility
const mockClient = {
  companies: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("../../utils/client.js", () => ({
  getClient: vi.fn().mockResolvedValue({
    companies: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }),
}));

describe("companies domain", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getClient } = await import("../../utils/client.js");
    vi.mocked(getClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof getClient>>
    );
  });

  describe("companyTools", () => {
    it("should export five company tools", () => {
      expect(companyTools).toHaveLength(5);
    });

    it("should have salesbuildr_companies_list tool", () => {
      const listTool = companyTools.find(
        (t) => t.name === "salesbuildr_companies_list"
      );
      expect(listTool).toBeDefined();
      expect(listTool?.inputSchema.properties).toHaveProperty("query");
      expect(listTool?.inputSchema.properties).toHaveProperty("from");
      expect(listTool?.inputSchema.properties).toHaveProperty("size");
      expect(listTool?.inputSchema.required).toBeUndefined();
    });

    it("should have salesbuildr_companies_get tool with required id", () => {
      const getTool = companyTools.find(
        (t) => t.name === "salesbuildr_companies_get"
      );
      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.properties).toHaveProperty("id");
      expect(getTool?.inputSchema.required).toContain("id");
    });

    it("should have salesbuildr_companies_create tool with required name", () => {
      const createTool = companyTools.find(
        (t) => t.name === "salesbuildr_companies_create"
      );
      expect(createTool).toBeDefined();
      expect(createTool?.inputSchema.properties).toHaveProperty("name");
      expect(createTool?.inputSchema.required).toContain("name");
    });

    it("should have salesbuildr_companies_update tool with required id", () => {
      const updateTool = companyTools.find(
        (t) => t.name === "salesbuildr_companies_update"
      );
      expect(updateTool).toBeDefined();
      expect(updateTool?.inputSchema.required).toContain("id");
    });

    it("should have salesbuildr_companies_delete tool with required id", () => {
      const deleteTool = companyTools.find(
        (t) => t.name === "salesbuildr_companies_delete"
      );
      expect(deleteTool).toBeDefined();
      expect(deleteTool?.inputSchema.required).toContain("id");
    });
  });

  describe("handleCompanyTool", () => {
    describe("salesbuildr_companies_list", () => {
      it("should call client.companies.list with search params", async () => {
        const mockResponse = { data: [], total: 0, from: 0, size: 25 };
        mockClient.companies.list.mockResolvedValue(mockResponse);

        const result = await handleCompanyTool("salesbuildr_companies_list", {
          query: "acme",
          from: 10,
          size: 50,
        });

        expect(mockClient.companies.list).toHaveBeenCalledWith({
          query: "acme",
          from: 10,
          size: 50,
        });
        expect(result.content[0].text).toContain("data");
        expect(result.isError).toBeUndefined();
      });

      it("should call client.companies.list with default params", async () => {
        const mockResponse = { data: [], total: 0, from: 0, size: 25 };
        mockClient.companies.list.mockResolvedValue(mockResponse);

        await handleCompanyTool("salesbuildr_companies_list", {});

        expect(mockClient.companies.list).toHaveBeenCalledWith({
          query: undefined,
          from: undefined,
          size: undefined,
        });
      });
    });

    describe("salesbuildr_companies_get", () => {
      it("should call client.companies.get with id", async () => {
        const mockCompany = { id: "comp-123", name: "Acme Corp" };
        mockClient.companies.get.mockResolvedValue(mockCompany);

        const result = await handleCompanyTool("salesbuildr_companies_get", {
          id: "comp-123",
        });

        expect(mockClient.companies.get).toHaveBeenCalledWith("comp-123");
        expect(result.content[0].text).toContain("Acme Corp");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_companies_create", () => {
      it("should call client.companies.create with company data", async () => {
        const mockCompany = { id: "comp-456", name: "New Company" };
        mockClient.companies.create.mockResolvedValue(mockCompany);

        const result = await handleCompanyTool(
          "salesbuildr_companies_create",
          {
            name: "New Company",
            city: "Austin",
            phone: "555-1234",
          }
        );

        expect(mockClient.companies.create).toHaveBeenCalledWith({
          name: "New Company",
          city: "Austin",
          phone: "555-1234",
        });
        expect(result.content[0].text).toContain("New Company");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_companies_update", () => {
      it("should call client.companies.update with id and data", async () => {
        const mockCompany = { id: "comp-123", name: "Updated Corp" };
        mockClient.companies.update.mockResolvedValue(mockCompany);

        const result = await handleCompanyTool(
          "salesbuildr_companies_update",
          {
            id: "comp-123",
            name: "Updated Corp",
          }
        );

        expect(mockClient.companies.update).toHaveBeenCalledWith(
          "comp-123",
          { name: "Updated Corp" }
        );
        expect(result.content[0].text).toContain("Updated Corp");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_companies_delete", () => {
      it("should call client.companies.delete with id", async () => {
        mockClient.companies.delete.mockResolvedValue(undefined);

        const result = await handleCompanyTool(
          "salesbuildr_companies_delete",
          { id: "comp-123" }
        );

        expect(mockClient.companies.delete).toHaveBeenCalledWith("comp-123");
        expect(result.content[0].text).toContain("deleted successfully");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown company tool", async () => {
        const result = await handleCompanyTool(
          "salesbuildr_companies_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown company tool");
      });
    });
  });
});
