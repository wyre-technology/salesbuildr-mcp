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
