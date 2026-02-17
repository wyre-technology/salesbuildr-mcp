/**
 * Opportunities domain tools for SalesBuildr MCP Server
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getClient } from "../utils/client.js";

/**
 * Opportunity domain tool definitions
 */
export const opportunityTools: Tool[] = [
  {
    name: "salesbuildr_opportunities_list",
    description:
      "Search and list sales opportunities in SalesBuildr. Returns paginated results with opportunity details including title, value, stage, and probability.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to filter opportunities by title",
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
    name: "salesbuildr_opportunities_get",
    description:
      "Get detailed information about a specific opportunity by its ID. Returns full opportunity details including pipeline stage, value, and associated contacts.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique opportunity ID",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "salesbuildr_opportunities_create",
    description:
      "Create a new sales opportunity in SalesBuildr. Title is required, all other fields are optional.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Opportunity title (required)",
        },
        companyId: {
          type: "string",
          description: "Associated company ID",
        },
        contactId: {
          type: "string",
          description: "Primary contact ID",
        },
        value: {
          type: "number",
          description: "Estimated deal value in dollars",
        },
        stage: {
          type: "string",
          description:
            "Pipeline stage (e.g., prospecting, qualification, proposal, negotiation, closed-won, closed-lost)",
        },
        probability: {
          type: "number",
          description: "Win probability as a percentage (0-100)",
        },
        expectedCloseDate: {
          type: "string",
          description: "Expected close date in ISO 8601 format (YYYY-MM-DD)",
        },
        notes: {
          type: "string",
          description: "Additional notes about the opportunity",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "salesbuildr_opportunities_update",
    description:
      "Update an existing opportunity in SalesBuildr. Provide the opportunity ID and any fields to update.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique opportunity ID (required)",
        },
        title: {
          type: "string",
          description: "Opportunity title",
        },
        companyId: {
          type: "string",
          description: "Associated company ID",
        },
        contactId: {
          type: "string",
          description: "Primary contact ID",
        },
        value: {
          type: "number",
          description: "Estimated deal value in dollars",
        },
        stage: {
          type: "string",
          description: "Pipeline stage",
        },
        probability: {
          type: "number",
          description: "Win probability as a percentage (0-100)",
        },
        expectedCloseDate: {
          type: "string",
          description: "Expected close date in ISO 8601 format (YYYY-MM-DD)",
        },
        notes: {
          type: "string",
          description: "Additional notes",
        },
      },
      required: ["id"],
    },
  },
];

/**
 * Handle opportunity domain tool calls
 */
export async function handleOpportunityTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const client = await getClient();

  switch (name) {
    case "salesbuildr_opportunities_list": {
      const params = args as {
        query?: string;
        from?: number;
        size?: number;
      };
      const result = await client.opportunities.list({
        query: params.query,
        from: params.from,
        size: params.size,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    case "salesbuildr_opportunities_get": {
      const { id } = args as { id: string };
      const opportunity = await client.opportunities.get(id);
      return {
        content: [
          { type: "text", text: JSON.stringify(opportunity, null, 2) },
        ],
      };
    }

    case "salesbuildr_opportunities_create": {
      const { id: _id, ...data } = args as Record<string, unknown>;
      const opportunity = await client.opportunities.create(data);
      return {
        content: [
          { type: "text", text: JSON.stringify(opportunity, null, 2) },
        ],
      };
    }

    case "salesbuildr_opportunities_update": {
      const { id, ...data } = args as { id: string } & Record<
        string,
        unknown
      >;
      const opportunity = await client.opportunities.update(id, data);
      return {
        content: [
          { type: "text", text: JSON.stringify(opportunity, null, 2) },
        ],
      };
    }

    default:
      return {
        content: [
          { type: "text", text: `Unknown opportunity tool: ${name}` },
        ],
        isError: true,
      };
  }
}
