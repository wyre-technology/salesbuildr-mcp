# SalesBuildr MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for integrating with the SalesBuildr quoting and sales platform. Built with a decision-tree architecture to expose domain-specific tools without overwhelming the LLM.

## Architecture

The server uses a **decision tree** pattern:

1. At root, only `salesbuildr_navigate` is exposed
2. User selects a domain (companies, contacts, products, opportunities, quotes)
3. Domain-specific tools become available along with `salesbuildr_back`
4. Tool calls route to domain handlers that interact with the SalesBuildr API

## Domains

| Domain | Tools | Description |
|--------|-------|-------------|
| **companies** | 5 | Company/account management (list, get, create, update, delete) |
| **contacts** | 5 | Contact management (list, get, create, update, delete) |
| **products** | 2 | Product catalog (list, get) |
| **opportunities** | 4 | Sales pipeline (list, get, create, update) |
| **quotes** | 3 | Quote management with line items (list, get, create) |

## Installation

```bash
npm install @wyre-technology/salesbuildr-mcp
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SALESBUILDR_API_KEY` | Yes (env mode) | - | Your SalesBuildr API key |
| `MCP_TRANSPORT` | No | `stdio` | Transport type: `stdio` or `http` |
| `MCP_HTTP_PORT` | No | `8080` | HTTP server port |
| `MCP_HTTP_HOST` | No | `0.0.0.0` | HTTP server host |
| `AUTH_MODE` | No | `env` | Authentication mode: `env` or `gateway` |

### Stdio Mode (Claude Desktop)

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "salesbuildr": {
      "command": "npx",
      "args": ["@wyre-technology/salesbuildr-mcp"],
      "env": {
        "SALESBUILDR_API_KEY": "your-api-key"
      }
    }
  }
}
```

### HTTP Mode (Gateway)

```bash
MCP_TRANSPORT=http AUTH_MODE=gateway node dist/index.js
```

In gateway mode, pass credentials via request headers:

```
X-Salesbuildr-API-Key: your-api-key
```

### Docker

```bash
docker run -d \
  -p 8080:8080 \
  -e SALESBUILDR_API_KEY=your-api-key \
  ghcr.io/wyre-technology/salesbuildr-mcp:latest
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build

# Run locally (stdio)
SALESBUILDR_API_KEY=your-key npm start

# Run locally (HTTP)
MCP_TRANSPORT=http SALESBUILDR_API_KEY=your-key npm start
```

## License

Apache-2.0
