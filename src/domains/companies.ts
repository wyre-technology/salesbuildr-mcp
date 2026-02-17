/**
 * Companies domain tools for SalesBuildr MCP Server
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getClient } from "../utils/client.js";

/**
 * Company domain tool definitions
 */
export const companyTools: Tool[] = [
  {
    name: "salesbuildr_companies_list",
    description:
      "Search and list companies in SalesBuildr. Returns paginated results with company details including name, domain, address, and contact info.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to filter companies by name or domain",
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
    name: "salesbuildr_companies_get",
    description:
      "Get detailed information about a specific company by its ID. Returns full company profile including address, contact info, and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique company ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "salesbuildr_companies_create",
    description:
      "Create a new company in SalesBuildr. Only name is required, all other fields are optional.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Company name (required)",
        },
        domain: {
          type: "string",
          description: "Company domain name (e.g., example.com)",
        },
        address: {
          type: "string",
          description: "Street address",
        },
        city: {
          type: "string",
          description: "City",
        },
        state: {
          type: "string",
          description: "State or province",
        },
        zip: {
          type: "string",
          description: "ZIP or postal code",
        },
        country: {
          type: "string",
          description: "Country",
        },
        phone: {
          type: "string",
          description: "Phone number",
        },
        website: {
          type: "string",
          description: "Company website URL",
        },
        notes: {
          type: "string",
          description: "Additional notes about the company",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "salesbuildr_companies_update",
    description:
      "Update an existing company in SalesBuildr. Provide the company ID and any fields to update.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique company ID (required)",
        },
        name: {
          type: "string",
          description: "Company name",
        },
        domain: {
          type: "string",
          description: "Company domain name",
        },
        address: {
          type: "string",
          description: "Street address",
        },
        city: {
          type: "string",
          description: "City",
        },
        state: {
          type: "string",
          description: "State or province",
        },
        zip: {
          type: "string",
          description: "ZIP or postal code",
        },
        country: {
          type: "string",
          description: "Country",
        },
        phone: {
          type: "string",
          description: "Phone number",
        },
        website: {
          type: "string",
          description: "Company website URL",
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
    name: "salesbuildr_companies_delete",
    description:
      "Delete a company from SalesBuildr by its ID. This action cannot be undone.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique company ID to delete",
        },
      },
      required: ["id"],
    },
  },
];

/**
 * Handle company domain tool calls
 */
export async function handleCompanyTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const client = await getClient();

  switch (name) {
    case "salesbuildr_companies_list": {
      const params = args as {
        query?: string;
        from?: number;
        size?: number;
      };
      const result = await client.companies.list({
        query: params.query,
        from: params.from,
        size: params.size,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    case "salesbuildr_companies_get": {
      const { id } = args as { id: string };
      const company = await client.companies.get(id);
      return {
        content: [{ type: "text", text: JSON.stringify(company, null, 2) }],
      };
    }

    case "salesbuildr_companies_create": {
      const { id: _id, ...data } = args as Record<string, unknown>;
      const company = await client.companies.create(data);
      return {
        content: [{ type: "text", text: JSON.stringify(company, null, 2) }],
      };
    }

    case "salesbuildr_companies_update": {
      const { id, ...data } = args as { id: string } & Record<
        string,
        unknown
      >;
      const company = await client.companies.update(id, data);
      return {
        content: [{ type: "text", text: JSON.stringify(company, null, 2) }],
      };
    }

    case "salesbuildr_companies_delete": {
      const { id } = args as { id: string };
      await client.companies.delete(id);
      return {
        content: [
          { type: "text", text: `Company ${id} deleted successfully.` },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown company tool: ${name}` }],
        isError: true,
      };
  }
}
