## [1.1.2](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.1.1...v1.1.2) (2026-02-18)


### Bug Fixes

* **ci:** convert pack-mcpb.js to ESM imports ([0990ee1](https://github.com/wyre-technology/salesbuildr-mcp/commit/0990ee1a8a9d90b75a1036787f90ffff7a8840c9))

## [1.1.1](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.1.0...v1.1.1) (2026-02-18)


### Bug Fixes

* **ci:** fix release workflow failures ([b9e4e5a](https://github.com/wyre-technology/salesbuildr-mcp/commit/b9e4e5a94c8cb055fa55c614a08da2d1d5ac8c8c))

# [1.1.0](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.0.1...v1.1.0) (2026-02-17)


### Features

* add MCPB bundle to release workflow ([f6607ec](https://github.com/wyre-technology/salesbuildr-mcp/commit/f6607ec1da527ac71f0481a5aa3f47ce83e4ae2b))
* add MCPB manifest for desktop installation ([5f643d0](https://github.com/wyre-technology/salesbuildr-mcp/commit/5f643d0fc5acc49a6bc392a08b80577fe06ef0d7))
* add MCPB pack script ([3e622ba](https://github.com/wyre-technology/salesbuildr-mcp/commit/3e622baaff04cf6af8dc4b3552cb97cda7560b98))
* add pack:mcpb script ([1044401](https://github.com/wyre-technology/salesbuildr-mcp/commit/1044401894e77d3ec524b368d5fade0d3e7c95bb))

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
