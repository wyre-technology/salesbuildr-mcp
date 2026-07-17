# SalesBuildr MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for integrating with the SalesBuildr quoting and sales platform. Built with a decision-tree architecture to expose domain-specific tools without overwhelming the LLM.

## Architecture

The server uses a **decision tree** pattern:

1. At root, only `salesbuildr_navigate` is exposed
2. User selects a domain (companies, contacts, products, opportunities, quotes)
3. Domain-specific tools become available along with `salesbuildr_back`
4. Tool calls route to domain handlers that interact with the SalesBuildr API

### Interactive Quote Card (MCP Apps)

`salesbuildr_quotes_get` renders as an interactive, read-only quote card in
MCP Apps hosts (Claude Desktop/web) — title, status, company/contact, dates,
line items, and totals; plain-JSON behavior is unchanged in other hosts.
The card is neutral by default and brandable via `window.__BRAND__` injection
or `MCP_BRAND_*` env vars (`MCP_BRAND_NAME`, `MCP_BRAND_LOGO_URL`,
`MCP_BRAND_PRIMARY_COLOR`, `MCP_BRAND_ACCENT_COLOR`, `MCP_BRAND_BG`,
`MCP_BRAND_TEXT`) — no rebuild needed.

## Domains

| Domain | Tools | Description |
|--------|-------|-------------|
| **companies** | 5 | Company/account management (list, get, create, update, delete) |
| **contacts** | 5 | Contact management (list, get, create, update, delete) |
| **products** | 2 | Product catalog (list, get) |
| **opportunities** | 4 | Sales pipeline (list, get, create, update) |
| **quotes** | 3 | Quote management with line items (list, get, create) |

## One-Click Deployment

> [!IMPORTANT]
> **Before you click:** this server depends on `@wyre-technology/node-salesbuildr`,
> which is hosted on the **GitHub Packages** npm registry. GitHub Packages has no
> anonymous access — even though the package is public, every `npm install` needs a
> token. The cloud builder runs `npm install` for you, so you must give it one, or
> the build fails with `npm error 401 Unauthorized ... npm.pkg.github.com`.
>
> 1. Create a GitHub **Personal Access Token** with the `read:packages` scope
>    ([classic token](https://github.com/settings/tokens/new?scopes=read:packages&description=salesbuildr-mcp%20deploy)).
>    Any GitHub account works — you do **not** need to be a member of the
>    `wyre-technology` org to read its public packages.
> 2. Add it as a build variable when prompted by the deploy flow:
>    - **Cloudflare Workers** → set a build variable named **`NODE_AUTH_TOKEN`** to your PAT
>      (Workers → Settings → Build → Variables and Secrets).
>    - **DigitalOcean App Platform** → set an encrypted env var named **`GITHUB_TOKEN`**
>      with scope **Build Time** to your PAT (the Dockerfile reads it for the install).

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/wyre-technology/salesbuildr-mcp/tree/main)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wyre-technology/salesbuildr-mcp)

## Installation

This package is published to the **GitHub Packages** npm registry, which requires a
token even for public packages. Authenticate once, then install:

```bash
# Authenticate npm to GitHub Packages (token needs the read:packages scope)
export NODE_AUTH_TOKEN=$(gh auth token)   # or a PAT with read:packages

npm install @wyre-technology/salesbuildr-mcp
```

The repo's `.npmrc` already points the `@wyre-technology` scope at GitHub Packages and
reads the token from `NODE_AUTH_TOKEN`, so no further config is needed.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SALESBUILDR_API_KEY` | Yes (env mode) | - | Your SalesBuildr API key |
| `SALESBUILDR_BASE_URL` | No | Library default | Tenant-specific base URL (e.g. `https://mytenant.salesbuildr.com`) |
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
