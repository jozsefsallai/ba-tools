---

title: Changelog
description: Changes to the API.
icon: history
---

## v1 (2026-11)

- Creating a timeline, formation or PvP match now uses your preferences for the settings you leave out, and `includeInStatistics` is optional when recording a match.
- `GET /api/v1/students` and raid `defenseTypes` accept attack and defense types by color (`red`, `yellow`, `blue`, `purple`, `green`).
- `GET /api/v1/roadmap` can be filtered with `categories`, `from` and `to`.
- First version of the public API: game data, shared content, PvP statistics, and full access to your own data with API keys.
- [MCP server](./mcp.md) at `/mcp` with a tool for every API operation. It requires signing in with OAuth.
