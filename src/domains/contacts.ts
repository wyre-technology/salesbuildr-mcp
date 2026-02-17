/**
 * Contacts domain tools for SalesBuildr MCP Server
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getClient } from "../utils/client.js";

/**
 * Contact domain tool definitions
 */
export const contactTools: Tool[] = [
  {
    name: "salesbuildr_contacts_list",
    description:
      "Search and list contacts in SalesBuildr. Optionally filter by company. Returns paginated results with contact details.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query to filter contacts by name or email",
        },
        companyId: {
          type: "string",
          description: "Filter contacts by company ID",
        },
        from: {
          type: "number",
          description: "Starting offset for pagination (default: 0)",
        },
        size: {
          type: "number",
          description: "Number of results per page (default: 25, max: 100)",
        },
      },
    },
  },
  {
    name: "salesbuildr_contacts_get",
    description:
      "Get detailed information about a specific contact by their ID. Returns full contact profile including company association.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique contact ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "salesbuildr_contacts_create",
    description:
      "Create a new contact in SalesBuildr. First name and last name are required.",
    inputSchema: {
      type: "object",
      properties: {
        firstName: {
          type: "string",
          description: "Contact first name (required)",
        },
        lastName: {
          type: "string",
          description: "Contact last name (required)",
        },
        email: {
          type: "string",
          description: "Email address",
        },
        phone: {
          type: "string",
          description: "Phone number",
        },
        title: {
          type: "string",
          description: "Job title",
        },
        companyId: {
          type: "string",
          description: "Associated company ID",
        },
        notes: {
          type: "string",
          description: "Additional notes about the contact",
        },
      },
      required: ["firstName", "lastName"],
    },
  },
  {
    name: "salesbuildr_contacts_update",
    description:
      "Update an existing contact in SalesBuildr. Provide the contact ID and any fields to update.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique contact ID (required)",
        },
        firstName: {
          type: "string",
          description: "Contact first name",
        },
        lastName: {
          type: "string",
          description: "Contact last name",
        },
        email: {
          type: "string",
          description: "Email address",
        },
        phone: {
          type: "string",
          description: "Phone number",
        },
        title: {
          type: "string",
          description: "Job title",
        },
        companyId: {
          type: "string",
          description: "Associated company ID",
        },
        notes: {
          type: "string",
          description: "Additional notes",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "salesbuildr_contacts_delete",
    description:
      "Delete a contact from SalesBuildr by their ID. This action cannot be undone.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique contact ID to delete",
        },
      },
      required: ["id"],
    },
  },
];

/**
 * Handle contact domain tool calls
 */
export async function handleContactTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const client = await getClient();

  switch (name) {
    case "salesbuildr_contacts_list": {
      const params = args as {
        query?: string;
        companyId?: string;
        from?: number;
        size?: number;
      };
      const result = await client.contacts.list({
        query: params.query,
        companyId: params.companyId,
        from: params.from,
        size: params.size,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    case "salesbuildr_contacts_get": {
      const { id } = args as { id: string };
      const contact = await client.contacts.get(id);
      return {
        content: [{ type: "text", text: JSON.stringify(contact, null, 2) }],
      };
    }

    case "salesbuildr_contacts_create": {
      const { id: _id, ...data } = args as Record<string, unknown>;
      const contact = await client.contacts.create(data);
      return {
        content: [{ type: "text", text: JSON.stringify(contact, null, 2) }],
      };
    }

    case "salesbuildr_contacts_update": {
      const { id, ...data } = args as { id: string } & Record<
        string,
        unknown
      >;
      const contact = await client.contacts.update(id, data);
      return {
        content: [{ type: "text", text: JSON.stringify(contact, null, 2) }],
      };
    }

    case "salesbuildr_contacts_delete": {
      const { id } = args as { id: string };
      await client.contacts.delete(id);
      return {
        content: [
          { type: "text", text: `Contact ${id} deleted successfully.` },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown contact tool: ${name}` }],
        isError: true,
      };
  }
}
