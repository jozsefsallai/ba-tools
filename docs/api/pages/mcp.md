---
title: MCP server
description: Use the API from Claude, ChatGPT, Cursor and other AI assistants.
icon: bot
---

The same data is available to AI assistants through a [Model Context Protocol](https://modelcontextprotocol.io) server:

```
https://ba.joexyz.online/mcp
```

Add it as a remote (streamable HTTP) MCP server or custom connector in your assistant. For example, in Claude Code:

```bash
claude mcp add --transport http ba-tools https://ba.joexyz.online/mcp
```

## Sign in

The MCP server always acts on your account, so you sign in when you connect. Your assistant opens a Joe's Blue Archive Tools sign-in page and keeps the access token it receives. You never paste an API key into the assistant. API keys don't work here; they're only for the HTTP API.

## Tools

There's one tool for each API operation, named after it:

- **Game data:** `search_students`, `get_student`, `get_student_skills`, `search_gifts`, `get_gift`, `list_banners`, `get_roadmap`.
- **Shared content:** `get_public_roster`, `get_public_timeline`, `get_public_timeline_group`.
- **PvP statistics:** `get_pvp_stats_status`, `get_pvp_stats_summary`, `list_pvp_teams`, `search_pvp_stats`.
- **Your data:** `get_me`, `get_preferences`, `update_preferences`, and `list_`, `get_`, `create_`, `update_` and `delete_` tools for formations, timelines, timeline groups, rosters, gift inventories and targets, PvP seasons, matches, formation presets, enemy presets and enemy teams, and recruitment accounts and sessions.

Tools return the same JSON as the API's `data`, and failures carry the same [error codes](./errors.md). Write tools are marked as such, and delete tools as destructive, so your assistant can ask before using them.

Tool calls count towards the per-user [usage limits](./index.md#usage-limits).
