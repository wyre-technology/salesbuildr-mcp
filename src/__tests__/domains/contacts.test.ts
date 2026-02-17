/**
 * Tests for the contacts domain tool handlers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { contactTools, handleContactTool } from "../../domains/contacts.js";

// Mock the client utility
const mockClient = {
  contacts: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("../../utils/client.js", () => ({
  getClient: vi.fn().mockResolvedValue({
    contacts: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  }),
}));

describe("contacts domain", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getClient } = await import("../../utils/client.js");
    vi.mocked(getClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof getClient>>
    );
  });

  describe("contactTools", () => {
    it("should export five contact tools", () => {
      expect(contactTools).toHaveLength(5);
    });

    it("should have salesbuildr_contacts_list tool", () => {
      const listTool = contactTools.find(
        (t) => t.name === "salesbuildr_contacts_list"
      );
      expect(listTool).toBeDefined();
      expect(listTool?.inputSchema.properties).toHaveProperty("query");
      expect(listTool?.inputSchema.properties).toHaveProperty("companyId");
      expect(listTool?.inputSchema.properties).toHaveProperty("from");
      expect(listTool?.inputSchema.properties).toHaveProperty("size");
    });

    it("should have salesbuildr_contacts_get tool with required id", () => {
      const getTool = contactTools.find(
        (t) => t.name === "salesbuildr_contacts_get"
      );
      expect(getTool).toBeDefined();
      expect(getTool?.inputSchema.required).toContain("id");
    });

    it("should have salesbuildr_contacts_create tool with required fields", () => {
      const createTool = contactTools.find(
        (t) => t.name === "salesbuildr_contacts_create"
      );
      expect(createTool).toBeDefined();
      expect(createTool?.inputSchema.required).toContain("firstName");
      expect(createTool?.inputSchema.required).toContain("lastName");
    });

    it("should have salesbuildr_contacts_update tool with required id", () => {
      const updateTool = contactTools.find(
        (t) => t.name === "salesbuildr_contacts_update"
      );
      expect(updateTool).toBeDefined();
      expect(updateTool?.inputSchema.required).toContain("id");
    });

    it("should have salesbuildr_contacts_delete tool with required id", () => {
      const deleteTool = contactTools.find(
        (t) => t.name === "salesbuildr_contacts_delete"
      );
      expect(deleteTool).toBeDefined();
      expect(deleteTool?.inputSchema.required).toContain("id");
    });
  });

  describe("handleContactTool", () => {
    describe("salesbuildr_contacts_list", () => {
      it("should call client.contacts.list with params", async () => {
        const mockResponse = { data: [], total: 0, from: 0, size: 25 };
        mockClient.contacts.list.mockResolvedValue(mockResponse);

        const result = await handleContactTool("salesbuildr_contacts_list", {
          query: "john",
          companyId: "comp-123",
          from: 0,
          size: 10,
        });

        expect(mockClient.contacts.list).toHaveBeenCalledWith({
          query: "john",
          companyId: "comp-123",
          from: 0,
          size: 10,
        });
        expect(result.content[0].text).toContain("data");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_contacts_get", () => {
      it("should call client.contacts.get with id", async () => {
        const mockContact = {
          id: "ct-123",
          firstName: "John",
          lastName: "Doe",
        };
        mockClient.contacts.get.mockResolvedValue(mockContact);

        const result = await handleContactTool("salesbuildr_contacts_get", {
          id: "ct-123",
        });

        expect(mockClient.contacts.get).toHaveBeenCalledWith("ct-123");
        expect(result.content[0].text).toContain("John");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_contacts_create", () => {
      it("should call client.contacts.create with contact data", async () => {
        const mockContact = {
          id: "ct-456",
          firstName: "Jane",
          lastName: "Smith",
        };
        mockClient.contacts.create.mockResolvedValue(mockContact);

        const result = await handleContactTool(
          "salesbuildr_contacts_create",
          {
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            companyId: "comp-123",
          }
        );

        expect(mockClient.contacts.create).toHaveBeenCalledWith({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          companyId: "comp-123",
        });
        expect(result.content[0].text).toContain("Jane");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_contacts_update", () => {
      it("should call client.contacts.update with id and data", async () => {
        const mockContact = {
          id: "ct-123",
          firstName: "John",
          lastName: "Updated",
        };
        mockClient.contacts.update.mockResolvedValue(mockContact);

        const result = await handleContactTool(
          "salesbuildr_contacts_update",
          {
            id: "ct-123",
            lastName: "Updated",
          }
        );

        expect(mockClient.contacts.update).toHaveBeenCalledWith("ct-123", {
          lastName: "Updated",
        });
        expect(result.content[0].text).toContain("Updated");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("salesbuildr_contacts_delete", () => {
      it("should call client.contacts.delete with id", async () => {
        mockClient.contacts.delete.mockResolvedValue(undefined);

        const result = await handleContactTool(
          "salesbuildr_contacts_delete",
          { id: "ct-123" }
        );

        expect(mockClient.contacts.delete).toHaveBeenCalledWith("ct-123");
        expect(result.content[0].text).toContain("deleted successfully");
        expect(result.isError).toBeUndefined();
      });
    });

    describe("unknown tool", () => {
      it("should return error for unknown contact tool", async () => {
        const result = await handleContactTool(
          "salesbuildr_contacts_unknown",
          {}
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Unknown contact tool");
      });
    });
  });
});
