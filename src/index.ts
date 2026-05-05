#!/usr/bin/env node
/**
 * SalesBuildr MCP Server
 *
 * This MCP server provides tools for interacting with the SalesBuildr API.
 * All tools are listed upfront so they work with every MCP client, including
 * remote connectors (claude.ai, mcp-remote) that do not support dynamic
 * tool-list changes. A helper `salesbuildr_navigate` tool provides domain
 * discovery and guidance.
 *
 * Supports both stdio and HTTP transports:
 * - stdio: default, for local CLI usage
 * - http: set MCP_TRANSPORT=http for hosted/gateway deployments
 *
 * Authentication: Set SALESBUILDR_API_KEY environment variable (env mode)
 *                 or pass x-salesbuildr-api-key header (gateway mode)
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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
import { resetClient } from "./utils/client.js";
import { setServerRef } from "./utils/server-ref.js";
import { credentialStore } from "./utils/credential-store.js";

/**
 * Transport and auth configuration types
 */
type TransportType = "stdio" | "http";
type AuthMode = "env" | "gateway";

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
 * All domain tools, collected once at startup
 */
let allDomainTools: Tool[] | null = null;

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
 * Load all domain tools (lazy-loaded on first access)
 */
function getAllDomainTools(): Tool[] {
  if (allDomainTools !== null) {
    return allDomainTools;
  }

  const domains: Domain[] = [
    "companies",
    "contacts",
    "products",
    "opportunities",
    "quotes"
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
 * Called once for stdio, or per-request for HTTP transport.
 */
function createMcpServer(): Server {

  const server = new Server(
    {
      name: "salesbuildr-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  setServerRef(server);

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

/**
 * Start the server with stdio transport (default)
 */
async function startStdioTransport(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SalesBuildr MCP server running on stdio");
}

/**
 * Start the server with HTTP Streamable transport
 * In gateway mode, credentials are extracted from request headers on each request.
 * Each request gets a fresh Server + Transport (stateless).
 */
async function startHttpTransport(): Promise<void> {
  const port = parseInt(process.env.MCP_HTTP_PORT || "8080", 10);
  const host = process.env.MCP_HTTP_HOST || "0.0.0.0";
  const authMode = (process.env.AUTH_MODE as AuthMode) || "env";
  const isGatewayMode = authMode === "gateway";

  const httpServer = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`
      );

      // Health endpoint - no auth required
      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            transport: "http",
            authMode: isGatewayMode ? "gateway" : "env",
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // MCP endpoint
      if (url.pathname === "/mcp") {
        // Extract per-request credentials from headers (gateway mode).
        // Credentials are stored in AsyncLocalStorage so concurrent
        // requests are isolated — no process.env mutation.
        const apiKey = isGatewayMode
          ? (req.headers["x-salesbuildr-api-key"] as string | undefined)
          : undefined;

        const handleMcp = () => {
          resetClient();
          const server = createMcpServer();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
          });

          res.on("close", () => {
            transport.close();
            server.close();
          });

          server.connect(transport).then(() => {
            transport.handleRequest(req, res);
          });
        };

        if (apiKey) {
          credentialStore.run({ apiKey }, handleMcp);
        } else {
          handleMcp();
        }
        return;
      }

      // 404 for everything else
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Not found",
          endpoints: ["/mcp", "/health"],
        })
      );
    }
  );

  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      console.error(
        `SalesBuildr MCP server listening on http://${host}:${port}/mcp`
      );
      console.error(
        `Health check available at http://${host}:${port}/health`
      );
      console.error(
        `Authentication mode: ${isGatewayMode ? "gateway (header-based)" : "env (environment variables)"}`
      );
      resolve();
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.error("Shutting down SalesBuildr MCP server...");
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * Main entry point - selects transport based on MCP_TRANSPORT env var
 */
async function main() {
  const transportType =
    (process.env.MCP_TRANSPORT as TransportType) || "stdio";

  if (transportType === "http") {
    await startHttpTransport();
  } else {
    await startStdioTransport();
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

main().catch(console.error);
