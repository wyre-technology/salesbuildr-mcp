/**
 * Quotes domain tools for SalesBuildr MCP Server
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getClient } from "../utils/client.js";

/**
 * Quote domain tool definitions
 */
export const quoteTools: Tool[] = [
  {
    name: "salesbuildr_quotes_list",
    description:
      "Search and list quotes in SalesBuildr. Optionally filter by company or opportunity. Returns paginated results with quote details.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to filter quotes by title",
        },
        companyId: {
          type: "string",
          description: "Filter quotes by company ID",
        },
        opportunityId: {
          type: "string",
          description: "Filter quotes by opportunity ID",
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
    name: "salesbuildr_quotes_get",
    description:
      "Get detailed information about a specific quote by its ID. Returns full quote details including line items, pricing, and status.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique quote ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "salesbuildr_quotes_create",
    description:
      "Create a new quote in SalesBuildr. Title is required. Optionally associate with a company, contact, and opportunity, and include line items.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Quote title (required)",
        },
        companyId: {
          type: "string",
          description: "Associated company ID",
        },
        contactId: {
          type: "string",
          description: "Associated contact ID",
        },
        opportunityId: {
          type: "string",
          description: "Associated opportunity ID",
        },
        notes: {
          type: "string",
          description: "Additional notes for the quote",
        },
        validUntil: {
          type: "string",
          description: "Quote expiration date in ISO 8601 format (YYYY-MM-DD)",
        },
        items: {
          type: "array",
          description: "Line items for the quote",
          items: {
            type: "object",
            properties: {
              productId: {
                type: "string",
                description: "Product ID from the catalog (optional)",
              },
              name: {
                type: "string",
                description: "Line item name (required)",
              },
              description: {
                type: "string",
                description: "Line item description",
              },
              quantity: {
                type: "number",
                description: "Quantity (required, default: 1)",
              },
              unitPrice: {
                type: "number",
                description: "Unit price in dollars (required)",
              },
              recurringPrice: {
                type: "number",
                description: "Recurring price per billing cycle",
              },
              billingCycle: {
                type: "string",
                description:
                  "Billing cycle for recurring items (monthly, quarterly, annually)",
              },
              discount: {
                type: "number",
                description: "Discount percentage (0-100)",
              },
            },
            required: ["name", "quantity", "unitPrice"],
          },
        },
      },
      required: ["title"],
    },
  },
];

/**
 * Handle quote domain tool calls
 */
export async function handleQuoteTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const client = await getClient();

  switch (name) {
    case "salesbuildr_quotes_list": {
      const params = args as {
        query?: string;
        companyId?: string;
        opportunityId?: string;
        from?: number;
        size?: number;
      };
      const result = await client.quotes.list({
        query: params.query,
        companyId: params.companyId,
        opportunityId: params.opportunityId,
        from: params.from,
        size: params.size,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    case "salesbuildr_quotes_get": {
      const { id } = args as { id: string };
      const quote = await client.quotes.get(id);
      return {
        content: [{ type: "text", text: JSON.stringify(quote, null, 2) }],
      };
    }

    case "salesbuildr_quotes_create": {
      const { id: _id, ...data } = args as Record<string, unknown>;
      const quote = await client.quotes.create(data);
      return {
        content: [{ type: "text", text: JSON.stringify(quote, null, 2) }],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown quote tool: ${name}` }],
        isError: true,
      };
  }
}
