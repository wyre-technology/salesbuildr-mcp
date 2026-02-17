## [1.0.1](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.0.0...v1.0.1) (2026-02-17)


### Bug Fixes

* **docker:** drop arm64 platform to fix QEMU build failures ([3385293](https://github.com/wyre-technology/salesbuildr-mcp/commit/33852931ab557bcfdfda6daf1615ffb1cb036761))

# 1.0.0 (2026-02-17)


### Features

* initial SalesBuildr MCP server ([551768b](https://github.com/wyre-technology/salesbuildr-mcp/commit/551768bf73bc16d1de4888cd35711cdc77ea61ee))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial MCP server implementation with decision-tree architecture
- Five domains: companies, contacts, products, opportunities, quotes
- `salesbuildr_navigate` tool for domain selection
- `salesbuildr_back` tool for returning to domain selection
- Companies domain: list, get, create, update, delete
- Contacts domain: list, get, create, update, delete
- Products domain: list, get
- Opportunities domain: list, get, create, update
- Quotes domain: list, get, create (with line items support)
- Stdio and HTTP (StreamableHTTP) transport support
- Gateway mode with header-based authentication (`x-salesbuildr-api-key`)
- Health check endpoint at `/health`
- Docker multi-stage build with non-root user
- CI/CD with GitHub Actions (test, release, Docker)
- Semantic release configuration
