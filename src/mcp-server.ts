/**
 * Shared MCP server factory for SalesBuildr.
 *
 * This module is **side-effect free** (importing it never starts a transport),
 * so it can be reused by every entrypoint:
 * - `index.ts` — stdio + Node HTTP transport
 * - `worker.ts` — Cloudflare Workers (Web Standard) transport
 *
 * All SalesBuildr tools are exposed upfront (flat architecture) for universal
 * MCP client compatibility.
 *
 * Per-request credential isolation is handled by the caller via the
 * AsyncLocalStorage-backed `credentialStore` (see `utils/credential-store.ts`):
 * wrap each request in `credentialStore.run({ apiKey }, fn)` and call
 * `resetClient()` first so the lazily-created client picks up that request's
 * credentials.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Domain imports
import { companyTools, handleCompanyTool } from "./domains/companies.js";
import { contactTools, handleContactTool } from "./domains/contacts.js";
import { productTools, handleProductTool } from "./domains/products.js";
import {
  opportunityTools,
  handleOpportunityTool,
} from "./domains/opportunities.js";
import { quoteTools, handleQuoteTool } from "./domains/quotes.js";
import { setServerRef } from "./utils/server-ref.js";
import { registerResourceHandlers } from "./resources.js";

/**
 * Available domains for navigation
 */
type Domain =
  | "companies"
  | "contacts"
  | "products"
  | "opportunities"
  | "quotes";

/**
 * Domain metadata for navigation
 */
const domainDescriptions: Record<Domain, string> = {
  companies:
    "Company/account management - search, create, update, delete companies",
  contacts:
    "Contact management - search, create, update, delete contacts",
  products:
    "Product catalog - search and view products with pricing",
  opportunities:
    "Sales pipeline - search, create, update opportunities",
  quotes:
    "Quote management - search, create, view quotes with line items",
};

/**
 * Get tools for a specific domain
 */
function getDomainTools(domain: Domain): Tool[] {
  switch (domain) {
    case "companies":
      return companyTools;
    case "contacts":
      return contactTools;
    case "products":
      return productTools;
    case "opportunities":
      return opportunityTools;
    case "quotes":
      return quoteTools;
  }
}

/**
 * All domain tools, collected once (memoized at module scope).
 */
let allDomainTools: Tool[] | null = null;
function getAllDomainTools(): Tool[] {
  if (allDomainTools !== null) {
    return allDomainTools;
  }

  const domains: Domain[] = [
    "companies",
    "contacts",
    "products",
    "opportunities",
    "quotes",
  ];
  const tools: Tool[] = [];

  for (const domain of domains) {
    tools.push(...getDomainTools(domain));
  }

  allDomainTools = tools;
  return tools;
}

/**
 * Navigation / discovery tool - helps the LLM find the right tools
 *
 * This is a stateless helper that describes available tools for a domain.
 * All domain tools are always listed in tools/list regardless of navigation
 * state, because many MCP clients (claude.ai connectors, mcp-remote) only
 * fetch the tool list once and do not support notifications/tools/list_changed.
 */
const navigateTool: Tool = {
  name: "salesbuildr_navigate",
  description:
    "Discover available SalesBuildr tools by domain. Returns tool names and descriptions for the selected domain. All tools are callable at any time — this is a help/discovery aid, not a prerequisite.",
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
        description: `The domain to explore:
- companies: ${domainDescriptions.companies}
- contacts: ${domainDescriptions.contacts}
- products: ${domainDescriptions.products}
- opportunities: ${domainDescriptions.opportunities}
- quotes: ${domainDescriptions.quotes}`,
      },
    },
    required: ["domain"],
  },
};

/**
 * Status tool - shows credentials status and available domains
 */
const statusTool: Tool = {
  name: "salesbuildr_status",
  description: "Show credentials status and available domains",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

/**
 * Create a fresh MCP server instance with all handlers registered.
 * Called once for stdio, or per-request for HTTP / Workers transports.
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "salesbuildr-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  setServerRef(server);
  registerResourceHandlers(server);

  /**
   * Handle ListTools requests - always returns ALL tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const domainTools = getAllDomainTools();
    return { tools: [navigateTool, statusTool, ...domainTools] };
  });

  /**
   * Handle CallTool requests
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      // Handle navigation / discovery helper
      if (name === "salesbuildr_navigate") {
        const { domain } = args as { domain: Domain };

        const domainTools = getDomainTools(domain);
        const toolSummary = domainTools
          .map((t) => `- ${t.name}: ${t.description}`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `${domainDescriptions[domain]}\n\nAvailable tools:\n${toolSummary}\n\nYou can call any of these tools directly.`,
            },
          ],
        };
      }

      if (name === "salesbuildr_status") {
        return {
          content: [
            {
              type: "text",
              text: `SalesBuildr MCP Server Status\n\nAvailable domains: companies, contacts, products, opportunities, quotes\n\nAll tools are available at all times. Use salesbuildr_navigate to discover tools by domain.`,
            },
          ],
        };
      }

      // Route to appropriate domain handler
      const toolArgs = (args ?? {}) as Record<string, unknown>;

      if (name.startsWith("salesbuildr_companies_")) {
        return await handleCompanyTool(name, toolArgs);
      }
      if (name.startsWith("salesbuildr_contacts_")) {
        return await handleContactTool(name, toolArgs);
      }
      if (name.startsWith("salesbuildr_products_")) {
        return await handleProductTool(name, toolArgs);
      }
      if (name.startsWith("salesbuildr_opportunities_")) {
        return await handleOpportunityTool(name, toolArgs);
      }
      if (name.startsWith("salesbuildr_quotes_")) {
        return await handleQuoteTool(name, toolArgs);
      }

      // Unknown tool
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}. Use salesbuildr_navigate to discover available tools by domain.`,
          },
        ],
        isError: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}
