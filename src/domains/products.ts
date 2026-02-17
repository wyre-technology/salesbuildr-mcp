/**
 * Products domain tools for SalesBuildr MCP Server
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getClient } from "../utils/client.js";

/**
 * Product domain tool definitions
 */
export const productTools: Tool[] = [
  {
    name: "salesbuildr_products_list",
    description:
      "Search and list products in the SalesBuildr catalog. Returns paginated results with product details including name, SKU, pricing, and category.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query to filter products by name, SKU, or category",
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
    name: "salesbuildr_products_get",
    description:
      "Get detailed information about a specific product by its ID. Returns full product details including pricing, description, and vendor info.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique product ID",
        },
      },
      required: ["id"],
    },
  },
];

/**
 * Handle product domain tool calls
 */
export async function handleProductTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const client = await getClient();

  switch (name) {
    case "salesbuildr_products_list": {
      const params = args as {
        query?: string;
        from?: number;
        size?: number;
      };
      const result = await client.products.list({
        query: params.query,
        from: params.from,
        size: params.size,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    case "salesbuildr_products_get": {
      const { id } = args as { id: string };
      const product = await client.products.get(id);
      return {
        content: [{ type: "text", text: JSON.stringify(product, null, 2) }],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown product tool: ${name}` }],
        isError: true,
      };
  }
}
