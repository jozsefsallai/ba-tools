---

title: Authentication
description: Create an API key and use it to access your own data.
icon: key-round
---

Endpoints under `/api/v1/me` act on your account, so they need an API key. Other endpoints need no authentication.

## Create a key

1. Sign in to [Joe's Blue Archive Tools](https://ba.joexyz.online).
2. Open the user menu at the bottom of the sidebar and choose **Manage account**.
3. Go to **API keys** and create a key.
4. Copy the key right away. It is shown only once.

You can revoke a key from the same page at any time. A revoked key stops working immediately.

## Send the key

Send the key as a bearer token in the `Authorization` header:

```bash
curl "${[ base_url ]}/api/v1/me" \
  -H "Authorization: Bearer $BA_TOOLS_API_KEY"
```

A key has full access to its owner's data: it can read, create, change and delete everything under `/api/v1/me`. Keep it secret. Don't put it in code that runs in a browser or ships to other people, and don't commit it.

A request without a valid key gets `401 Unauthorized`.

## In Yaak

The **Your data** folder of this workspace already sends `${[ api_key ]}` as a bearer token. Set the `api_key` variable in your environment to your key.
