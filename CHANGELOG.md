## [1.2.2](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.2.1...v1.2.2) (2026-04-06)


### Bug Fixes

* per-request MCP Server+Transport for gateway compatibility ([f072b09](https://github.com/wyre-technology/salesbuildr-mcp/commit/f072b098577cad5945d405164a0e35a97154d2dc))

## [1.2.1](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.2.0...v1.2.1) (2026-04-06)


### Bug Fixes

* allow unauthenticated tools/list in gateway mode ([f4e7d4b](https://github.com/wyre-technology/salesbuildr-mcp/commit/f4e7d4b9a1aa9de5e7d15eac0ad70f9ea906dff3))

# [1.2.0](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.1.5...v1.2.0) (2026-03-10)


### Features

* **elicitation:** add MCP elicitation support with graceful fallback ([1fb17f0](https://github.com/wyre-technology/salesbuildr-mcp/commit/1fb17f07024c8ecce71954300001465d50596bcf))

## [1.1.5](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.1.4...v1.1.5) (2026-03-02)


### Bug Fixes

* **ci:** fix broken YAML in Discord notification step ([9b0035c](https://github.com/wyre-technology/salesbuildr-mcp/commit/9b0035c2a85bfc419d6c425fb147ed132202de5f))
* **ci:** move Discord notification into release workflow ([91e2b28](https://github.com/wyre-technology/salesbuildr-mcp/commit/91e2b284545ebdc185906ea1a162a0c9f12e87b6))
* support SALESBUILDR_BASE_URL for tenant-specific subdomains ([#29](https://github.com/wyre-technology/salesbuildr-mcp/issues/29)) ([3436f10](https://github.com/wyre-technology/salesbuildr-mcp/commit/3436f10cccece9a60ea479d13d759bc40583b86e))

## [Unreleased]

### Added

- `SALESBUILDR_BASE_URL` environment variable support — pass your tenant-specific subdomain URL (e.g. `https://mytenant.salesbuildr.com`) to override the library default base URL (fixes #29)

## [1.1.4](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.1.3...v1.1.4) (2026-02-25)


### Bug Fixes

* add missing node-salesbuildr dependency to Docker image ([#2](https://github.com/wyre-technology/salesbuildr-mcp/issues/2)) ([b91ea44](https://github.com/wyre-technology/salesbuildr-mcp/commit/b91ea442ec26956ea72cf6bd5bb190b7c13e08ec)), closes [#1](https://github.com/wyre-technology/salesbuildr-mcp/issues/1)

## [1.1.3](https://github.com/wyre-technology/salesbuildr-mcp/compare/v1.1.2...v1.1.3) (2026-02-23)


### Bug Fixes

* quote MCPB bundle filename to prevent shell glob expansion failure ([a654bb1](https://github.com/wyre-technology/salesbuildr-mcp/commit/a654bb15e5f9cd41cf61f8e7246e1f4972abfae8))
* rename duplicate step id 'version' to 'release-version' in docker job ([63472cb](https://github.com/wyre-technology/salesbuildr-mcp/commit/63472cb7e95d8f991d0178d0d56acce1df14f695))

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
