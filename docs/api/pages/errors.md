---
title: Errors
description: Error responses and what they mean.
icon: triangle-alert
order: 3
---

Errors return an HTTP status code and a JSON body with a machine-readable `code` and a readable `message`:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid query parameters.",
    "details": [
      {
        "path": "rarity",
        "message": "Too big: expected number to be <=3"
      }
    ]
  }
}
```

`details` is included when there is more to say, such as which parameters failed validation.

| Status | `code` | Meaning |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Parameters or body are invalid, such as a missing field, an unknown field, a wrong type or a malformed id. |
| 401 | `UNAUTHORIZED` | The API key is missing, invalid or revoked. |
| 403 | `FORBIDDEN` | The key is valid but can't do this. |
| 404 | `NOT_FOUND` | The resource doesn't exist, or it isn't yours. |
| 409 | `CONFLICT` | The change clashes with existing data, such as a duplicate friend code. |
| 429 | `RATE_LIMITED` | You sent too many requests. Wait for the number of seconds in the `Retry-After` header. See [Usage limits](./index.md#usage-limits). |
| 500 | `INTERNAL_ERROR` | Something went wrong on our side. Try again later. |

Request bodies are validated strictly: unknown fields are rejected with `400`, not ignored.
