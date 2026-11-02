---
title: Introduction
description: Read Blue Archive game data and manage your user data on Joe's Blue Archive Tools over HTTP.
icon: book-open
---

The Joe's Blue Archive Tools API gives programs the same data the site uses:

- **Game data**: students, skills, gifts, upcoming Global banners, and the Global roadmap.
- **Shared content**: timelines, timeline groups, and rosters that players made public.
- **PVP statistics**: Tactical Challenge statistics aggregated from all recorded matches.
- **Your data**: your formations, timelines, rosters, gift planners, PVP tracker, and recruitment history.

Game data, shared content, and statistics need no authentication, however, your data needs an [API key](./authentication.md).

## Base URL

```text
${[ base_url ]}/api/v1
```

All requests and responses use JSON. CORS is enabled, so you can call the API from a browser too.

## Quick start

```bash
curl "${[ base_url ]}/api/v1/students?q=hoshino&limit=1"
```

```json
{
  "data": [
    {
      "id": "hoshino",
      "name": "Hoshino",
      "school": "abydos",
      "rarity": 3,
      "matchScore": 1
    }
  ]
}
```

## Responses

Successful responses wrap the result in `data`. Lists that can be long are paginated: they also have a `pagination` object, and you pass its `nextCursor` back as `?cursor=` to get the next page.

```json
{
  "data": [],
  "pagination": {
    "hasMore": true,
    "nextCursor": "…"
  }
}
```

Resources stored for you have an `id` and a `createdAt` timestamp (ISO 8601). Other timestamps, such as PVP match dates, are Unix milliseconds.

Errors use a separate format, described in [Errors](./errors.md).

## Versioning

This is version 1. New fields and endpoints can be added to v1 at any time, so ignore fields you don't recognize. Breaking changes will come as a new version under a new path (`/api/v2`). See the [changelog](./changelog.md).

The older, undocumented `GET /api/students` endpoint still works and isn't changing, but new integrations should use `GET /api/v1/students`.

## Usage limits

Requests are rate limited per minute, using a sliding window:

| Requests | Limit | Counted per |
| --- | --- | --- |
| Public endpoints | 120 per minute | IP address |
| `POST /api/v1/pvp/stats/search` | 20 per minute | IP address |
| `GET /api/v1/me/...` | 120 per minute | API key owner |
| `POST`, `PATCH` and `DELETE /api/v1/me/...` | 60 per minute | API key owner |

Requests with a missing or invalid API key count towards the public limit of your IP address. Responses served from our cache don't count at all.

[MCP server](./mcp.md) tool calls count per signed-in user: read tools towards the `GET` limit, write tools towards the write limit, and `search_pvp_stats` towards the search limit.

Responses to `/api/v1/me/...` include your current standing:

- `X-RateLimit-Limit`: requests allowed per minute.
- `X-RateLimit-Remaining`: requests left in the current window.
- `X-RateLimit-Reset`: when the window resets, as a Unix timestamp in seconds.

Over the limit, you get `429 Too Many Requests` with a `RATE_LIMITED` error and a `Retry-After` header with the number of seconds to wait.

Please cache what you can: game data changes rarely, and its responses can be cached for an hour.
