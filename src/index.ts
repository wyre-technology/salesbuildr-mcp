#!/usr/bin/env node
/**
 * SalesBuildr MCP Server
 *
 * This MCP server provides tools for interacting with the SalesBuildr API.
 * It implements a decision tree architecture where tools are dynamically
 * loaded based on the selected domain.
 *
 * Supports both stdio and HTTP (StreamableHTTP) transports.
 * Authentication: Set SALESBUILDR_API_KEY environment variable (env mode)
 *                 or pass x-salesbuildr-api-key header (gateway mode)
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
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
 * Server state management
 */
interface ServerState {
  currentDomain: Domain | null;
}

const state: ServerState = {
  currentDomain: null,
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
 * Navigation tool - entry point for decision tree
 */
const navigateTool: Tool = {
  name: "salesbuildr_navigate",
  description:
    "Navigate to a specific domain in SalesBuildr. Call this first to select which area you want to work with. After navigation, domain-specific tools will be available.",
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
        description: `The domain to navigate to:
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
 * Back navigation tool - return to domain selection
 */
const backTool: Tool = {
  name: "salesbuildr_back",
  description:
    "Return to domain selection. Use this to switch to a different area of SalesBuildr.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

/**
 * Create the MCP server
 */
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

/**
 * Handle ListTools requests - returns tools based on current state
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: Tool[] = [];

  if (state.currentDomain === null) {
    // At root - show navigation tool only
    tools.push(navigateTool);
  } else {
    // In a domain - show domain tools plus back navigation
    tools.push(backTool);
    tools.push(...getDomainTools(state.currentDomain));
  }

  return { tools };
});

/**
 * Handle CallTool requests
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Handle navigation
    if (name === "salesbuildr_navigate") {
      const { domain } = args as { domain: Domain };
      state.currentDomain = domain;

      const domainTools = getDomainTools(domain);
      const toolNames = domainTools.map((t) => t.name).join(", ");

      return {
        content: [
          {
            type: "text",
            text: `Navigated to ${domain} domain. Available tools: ${toolNames}`,
          },
        ],
      };
    }

    // Handle back navigation
    if (name === "salesbuildr_back") {
      state.currentDomain = null;
      return {
        content: [
          {
            type: "text",
            text: "Returned to domain selection. Use salesbuildr_navigate to select a domain: companies, contacts, products, opportunities, quotes",
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
          text: `Unknown tool: ${name}. Use salesbuildr_navigate to select a domain first.`,
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

/**
 * Start the server with stdio transport (default)
 */
async function startStdioTransport(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SalesBuildr MCP server running on stdio");
}

/**
 * Start the server with HTTP Streamable transport
 * In gateway mode, credentials are extracted from request headers on each request
 */
async function startHttpTransport(): Promise<void> {
  const port = parseInt(process.env.MCP_HTTP_PORT || "8080", 10);
  const host = process.env.MCP_HTTP_HOST || "0.0.0.0";
  const authMode = (process.env.AUTH_MODE as AuthMode) || "env";
  const isGatewayMode = authMode === "gateway";

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
  });

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
        // In gateway mode, extract credentials from headers
        if (isGatewayMode) {
          const apiKey = req.headers["x-salesbuildr-api-key"] as
            | string
            | undefined;

          if (!apiKey) {
            console.error(
              "Gateway mode: Missing x-salesbuildr-api-key header"
            );
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Missing credentials",
                message:
                  "Gateway mode requires X-Salesbuildr-API-Key header",
                required: ["X-Salesbuildr-API-Key"],
              })
            );
            return;
          }

          // Reset client so next getClient() picks up the new key
          resetClient();
          process.env.SALESBUILDR_API_KEY = apiKey;
        }

        transport.handleRequest(req, res);
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

  await server.connect(transport);

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
    await server.close();
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
