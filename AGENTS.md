# AGENTS.md

Joe's Blue Archive Tools (never "BA Tools" or "Blue Archive Tools" in user-facing text) — Next.js 16 (App Router) web app with Convex backend, Prisma read-only DB, Clerk auth, and Biome for linting/formatting. Deployed to Vercel.

## Commands

```bash
pnpm install                  # install deps
pnpm dev                      # Next.js + Convex dev in parallel (predev ensures Convex is ready first)
pnpm run dev:frontend         # Next.js only
pnpm run dev:backend          # Convex only
pnpm build                    # runs prisma generate, then next build
pnpm lint                     # next lint (Next.js ESLint rules)
pnpm run lint:fix             # biome lint . --write
pnpm format                   # biome format . --write
pnpm run db:pull              # prisma db pull (re-introspects live DB)
pnpm run db:generate          # prisma generate (regenerates client)
pnpm game-data                # lists the game data syncs; run one with pnpm game-data <command> [options]
```

**No test suite.** Closest verification: `pnpm build` (type-checks via tsc) or `npx biome check src/path/to/file.ts --write`.

## Import Aliases

| Alias           | Resolves to                                                           |
| --------------- | --------------------------------------------------------------------- |
| `@/*`           | `src/*`                                                               |
| `~convex/*`     | `convex/_generated/*`                                                 |
| `~prisma`       | `src/lib/db/client.ts` (re-exports generated Prisma client)           |
| `~convex-lib/*` | `convex/lib/*` (shared Convex validators, e.g. for MCP input schemas) |

Always use these aliases. Never import from the raw generated paths.

## Architecture

- **Prisma / PlanetScale Postgres** (through Neon's serverless driver, `@prisma/adapter-neon`) — static game data, **read-only**. Schema pulled from AronaBot's DB via `prisma db pull`. No migrations. All table models: `Student`, `Skill`, `StudentSkill`, `StudentSkillText`, `SkillEffect`, `SkillEffectText`, `Gift`, `Mission`, `Banner`, `GameBanner`.
- **Skills** — `Skill` is the legacy SchaleDB-seeded model, kept until AronaBot moves off it. `StudentSkill` (+ texts and effects) comes from the game data via `pnpm game-data skills` / the `sync-student-skills` Trigger task; description markup is documented on `SkillTextData` in `src/lib/game-data/contract.ts`.
- **Relationship stories** — `StudentBondStory` lists each student's relationship story episodes (titles in every language, the bond rank each opens at, and which one unlocks the memorial lobby or is the bond gear's), from the game files via `pnpm game-data bond-stories` / the `sync-bond-stories` Trigger task. JP decides the episodes and unlocks; EN/TW/TH titles are Global's. Shown on the student page and in `GET /api/v1/students/:id` / `get_student`.
- **Gift preferences** — the `seed-gifts` Trigger task creates `Gift` rows from SchaleDB's items and sets each student's adored/loved/liked gifts by matching tags. Gift tags come from the JP game files (`listFavorItems` in mx-data-sync) when it can read them, otherwise from SchaleDB, which adds a new student's unique tags to its gifts late. Students not on SchaleDB yet are passed in the payload (`list-new-students` output). The run's `incompleteStudents` lists students whose unique tags no gift has, so their gifts need another run.
- **Missions** — `CampaignMission` holds the main story missions (drops, hexamap, turn goals) from the game files (`pnpm game-data missions` / the `sync-missions` Trigger task). Saving works out each mission's routes with `src/lib/missions/solver.ts` (fewest turns, fewest with the Hard missions' Pyroxene box, fewest with enough battles for the S rank star) and stores them in `solutions`; the rules it plays by are in its header comment, checked against the wiki's routes and the Japanese wiki's map rules (bluearchive.wikiru.jp, 任務): replaying the wiki's turn-by-turn routes through it reproduces the enemy phases they describe in 262 of 272, and for 225 of 240 missions its all-stars route takes exactly the challenge's turns. Change the solver, then re-run the sync. Shown at `/missions`, and served by `GET /api/v1/missions` (`list_missions`) and `GET /api/v1/missions/:label` (`get_mission`; flattened for AronaBot's mission command by `src/lib/public-api/resources/missions.server.ts`) and as a map image at `/api/missions/:label/map`, the same one the mission's OG image shows. `Mission` is AronaBot's own table, unrelated. The sync also saves the drops to `GameItem` (keyed by the game's `ParcelType` and id; `ParcelType`, `ItemCategory` and `EquipmentCategory` mirror the game's enums, and rarity uses `ItemRarity`). Both it and the item sync only add or update `GameItem` rows. Drop icons come from the image sync (`v2/images/item-icons/`).
- **Game items** — `GameItem` holds every released item, equipment piece and currency on JP or Global, from the game files via `pnpm game-data items` / the `sync-game-items` Trigger task. JP's rows win; Global adds the items only it has and the EN/TW/TH names. Query it by the ids a page needs (`getGameItems`), not whole. `ItemCategory` has Global's `MonthlyBonus` on top of JP's values.
- **Inventory scanner** — `/inventory-scanner` reads item counts from screenshots or screen recordings of the game's Items and Equipment lists, in the browser (`src/lib/inventory-scan/`, worker in `src/workers/inventory-scan.ts`). Icons are matched against templates of every `GameItem` icon (`scripts/prepare-item-icons.ts`, built and uploaded with the OCR assets, so new items need a deployment); counts against digit templates cut from the game's font (`count-glyphs.json`, one set per game font: English, a thin English some clients have, Japanese, Korean, Traditional Chinese, Thai). The list is consumables first, then ascending ids. `merge.ts` only treats an item as "none owned" when its neighbors are proven to be next to each other, which needs overlapping screenshots and the default sort. `scope.ts` decides which items are kept; planners are adapters in `exporters/`. Recordings are played into the same workers (`video.ts`), which read a frame when the list settles and every quarter second while it moves; stretches playback skipped are sought back to afterwards, and a video the browser won't play (iOS Low Power Mode) is stepped through by seeking. iOS loads no frames before a video plays, and pauses one that isn't on screen, so playback starts once the metadata is in and the video sits on the page, 1px and nearly transparent. Readings of an item across frames are decided by majority, and a cut-off row only links to the next image's first row (or a later one when the rows above it repeat), since look-alike rows otherwise link unrelated images.
- **Roadmap suggestions** — `UpcomingContent` caches JP's raid seasons, events and story chapters from the game files (`pnpm game-data upcoming` / the `sync-upcoming-content` Trigger task, weekly after JP maintenance). The roadmap editor's "Add" form suggests what comes after the newest roadmap item of a kind (`src/lib/roadmap/suggestions.ts`); dates are Global's own when its files have them, otherwise projected from JP. Bosses the game names by code (`EN0023`) are mapped to roadmap enums there, so a new boss needs a new entry. A main story chapter released in parts is suggested part by part: from Global's per-episode dates, or on JP from the episodes the files have beyond the ones the roadmap's items count (`Scenario.episodeCount`). `Scenario.label` holds the chapter's number (`Act 2, Volume 2, Chapter 1, Part 1`) and is shown above its `name`. Bonus campaigns aren't in the game files.
- **AronaBot banners** — the bot's `/gacha` banners (`Banner`) follow the `GameBanner` table: Global gets the banners running now, JP the newest set (selectable pickups and 2★ pickups are skipped). `aronabot-sync-banners` (`src/trigger/aronabot-sync-banners.ts`) runs daily after Global's 02:00 UTC banner start and 10 minutes after the last `GameBanner` change (debounced, `onGameBannersChanged` in `src/lib/game-banners.server.ts`). Regions whose pickups differ get new banners and their recruitment points and total pulls reset in AronaBot's Redis (`ARONABOT_REDIS_URL`), then one announcement covering them is posted and published in the bot's Announcement channel (`ARONABOT_DISCORD_TOKEN`, `ARONABOT_ANNOUNCEMENT_CHANNEL_ID`), which forwards it to followers. These env vars belong on the Trigger deployment.
- **Sprite gallery** — the student page's carousel shows the student's sprites, then its family's other students (one group each), then its non-playable variants (story-only outfits, `v2/images/students/spine/_other/<id>/`), following the `related` links in the sprite manifest (`StudentSpriteManifest`). The image sync renders the variants and rewrites the links of every student whenever it runs with sprites (`pnpm game-data images`; `--all-variants` renders every family's unpublished variants, `--refresh-variants` published ones again). Families come from `baseVariantId`; variants are found by portrait or Japanese name, and `src/lib/game-data/sprite-variants.ts` fixes wrong links, leaves skeletons out (`family: null`) and marks spoilers, which stay blurred until revealed. Variants aren't named.
- **Convex** — all authenticated user data (formations, timelines, rosters, PvP, gifts, preferences). Separate deployment. Real-time.
- **Clerk** — auth. Integrated with Convex via JWT bridge. User sync via Svix webhook at `POST /webhooks/clerk` on the Convex HTTP router. The display name (`users.name`) is Clerk's first and last name, synced by the webhook, minus the names Google fills in (`convex/lib/userName.ts`): Google sign-in puts people's real names in empty name fields, at sign-up and on later sign-ins. The webhook keeps the names it accepted (`users.firstName`/`lastName`) and rejects a change that fills an empty field with the Google account's name right after a sign-in or Google link; other edits are kept even when they match. Rejected names are cleared in Clerk too (`users.setClerkNames`, needs `CLERK_SECRET_KEY` on Convex). New users, and users the webhook hasn't seen since, lose every part matching a Google name; a connected Discord account's first name (the Discord display name) is kept, and fills in for a first name removed that way. Show it (`useCurrentUser()`), not Clerk's `firstName`/`fullName`.
- Students are fetched server-side in the root layout and provided via `StudentsProvider` — don't re-fetch per page.

## Generated Code — Do Not Edit

- `convex/_generated/` — regenerated by `convex dev` / `convex deploy`
- `src/lib/db/generated/` — regenerated by `prisma generate` (gitignored; `pnpm build` runs this automatically)

## Required Environment Variables

All must be present in `.env.local`. See `.env.example` for the full list.

- `IMAGE_CDN_URL` — **required at startup/build**; Next.js config throws if missing. Use `https://aronabot.cdn.nimblebun.works` locally.
- `DATABASE_URL` — PlanetScale Postgres connection string (used by both Next.js and Prisma config)
- `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`
- `API_BRIDGE_SECRET` — must match the same variable on the Convex deployment; the public API (`/api/v1/me/*`) uses it to act for API key owners.
- `TRIGGER_SECRET_KEY` — optional; lets the roadmap admin page start the `sync-upcoming-content` task ("Read game files"). A manual run cancels the task's pending maintenance checks.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — REST credentials of the Upstash database behind `REDIS_URL`; `@upstash/ratelimit` uses them to rate-limit `/api/v1`. When unset (or Upstash is down), requests aren't limited.
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — optional; PostHog analytics and error tracking (see Analytics below). Unset means no analytics.
- `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` — optional, build time only; production builds upload the source maps to PostHog error tracking with them (see Analytics below). Unset means no upload.
- `NEXT_PUBLIC_PLANA_AI_ENABLED`, `OPENAI_API_KEY`, `CHROMA_API_KEY`, `CHROMA_TENANT_ID`, `CHROMA_DATABASE_NAME` — Plana AI feature. Chat provider keys are supplied through Plana's BYOK settings UI.

## Key Quirks

- **`reactStrictMode: false`** — intentional; the Spine skeletal animation renderer breaks under Strict Mode double-invocation. Do not re-enable.
- **i18n uses locale-based routing** via next-intl (`localePrefix: "as-needed"`). English is unprefixed (`/bond`); Japanese is `/ja/...`. Locales: `en` (default), `ja`. Page locale comes from the `[locale]` segment / `next/root-params` (not `cookies()` in RSC). A next-intl locale cookie remembers an explicit choice so unprefixed paths can redirect (e.g. `/bond` → `/ja/bond`); `Accept-Language` detection is off. Three message namespaces: `common`, `static`, `tools`. Non-English translations deep-merge with English fallback. Navigation helpers live in `src/i18n/navigation.ts`.
- **Biome** handles lint + format (not ESLint/Prettier). `noUnusedImports` is an error. Objects and arrays always expand to one entry per line (`formatter.expand: "always"`), and `if`/loop bodies always need braces (`useBlockStatements`, autofixed). `public/`, `vendor/`, generated code, `src/components/ui/` (shadcn) and `docs/api/yaak.json` are excluded. `next lint` is still available for Next.js-specific rules.
- **Shadcn/ui**: add components via `npx shadcn@latest add <component>`, not manually.
- **Content-Security-Policy** is built in `next.config.ts` (`cspDirectives`). When a feature loads scripts, frames or fetches from a new external origin, add it there. `/plana-ai` gets a stricter `img-src` so model replies can't leak chat data through image URLs.
- **Roles** (`isSuperUser`, `isMaintainer`, `canAccessPlanaAI`) come only from Clerk public or private metadata, never `unsafeMetadata` (users can write it themselves).
- **PWA (Serwist)**: service worker built from `src/sw.ts` → `public/sw.js`. Disabled in development.

## Analytics (PostHog)

Started in `src/instrumentation-client.ts`, configured in `src/lib/analytics/posthog.client.ts` to match the privacy policy (https://nimblebun.works/en/privacy, section 12): events are never tied to the account (no `identify`, `person_profiles: "never"`), no session recordings, surveys or feature flags, no Plana AI autocapture, and Clerk/OAuth tokens are stripped from URLs. Exceptions are autocaptured for error tracking. Production builds with `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID` upload the browser bundles' source maps there (`posthogSourceMaps` in `next.config.ts`; the release version is the Vercel commit) and then delete them, so they're never served. Server bundles get no source maps: only the browser reports errors, and mapping them too ran Vercel's build out of memory. Analytics are opt-in everywhere: every visitor gets a consent banner, and nothing is captured or stored until they allow it (no region checks, on purpose). Anyone can turn analytics off from the footer's "Analytics" link or the Preferences page (per browser). In development without `NEXT_PUBLIC_POSTHOG_KEY`, analytics are simulated: the banner and switch work against localStorage (`ba-analytics-simulated-consent`), `track()` logs `[analytics] …` to the console, and nothing is sent. Use a separate PostHog project if you need real events locally. Don't route PostHog through a first-party proxy: the policy says content blockers may block analytics. Product events go through `track()` (`posthog.client.ts`), typed by the catalog in `src/lib/analytics/events.ts`; fire them after the action succeeds, and never put user-written text or ids of the user's own items in properties. Every event is documented for users in `ANALYTICS.md`: update it with the catalog. If you change what's collected, check the policy still covers it.

## Translations (Crowdin)

`src/i18n/translations/en/` is the source; everything else syncs with [Crowdin](https://crowdin.com/project/joexyz-ba-tools). Setup is in `crowdin.yml` and `.github/workflows/crowdin-*.yml`.

- **Repo to Crowdin:** pushing locale changes to `master` uploads the English sources. If a push changes other locales, those are uploaded too and auto-approved. Renaming a key counts as deleting it, so its translations are lost on Crowdin.
- **Crowdin to repo:** after a project build on Crowdin, an hourly workflow commits the new translations to `master`, which deploys to production. Only approved strings are exported; the rest fall back to English. Run the `Crowdin pull` workflow manually to skip the wait.
- **Stale builds are skipped.** A build older than the last commit touching `src/i18n/translations` is ignored, because applying it would undo repo edits made since. After a locale push, wait for `Crowdin upload` to finish, then build again to pick up Crowdin changes.
- **Don't use `crowdin download translations` in the pull workflow.** It creates a new build on every run, so translations would ship without anyone building the project. `scripts/crowdin-pull.sh` reads the latest existing build instead.
- **`pnpm run translations:check`** validates locale files against English (unknown keys, ICU syntax, placeholders, large key losses). The pull workflow won't commit if it fails.

## Go/WASM Native Module

- `native/` — standalone Go module compiled with **TinyGo** (not standard Go). Exposes `NativeModules.simulateInventoryManagement` (Monte Carlo sim, 30k iterations).
- Output: `public/wasm/main.wasm` + `public/wasm/wasm_exec.js` (TinyGo shim). Binary is committed.
- Rebuild only when changing Go code: `sh build-native-modules.sh` (dev) or `sh build-native-modules.sh --prod`.
- Loaded in a Web Worker (`src/workers/native-modules.ts`) to avoid blocking the main thread.

## Public API (v1)

Route handlers in `src/app/api/v1/` (`/api/students` is the legacy endpoint; keep it unchanged). Shared helpers are in `src/lib/public-api/`; Prisma reads shared with the MCP tools are in `src/lib/data/`.

- **Public** routes (game data, public timelines/rosters, PvP stats) use `publicRoute`.
- **User** routes under `/api/v1/me` use `userRoute`, which accepts only Clerk API keys (`auth({ acceptsToken: "api_key" })`), never session cookies. Users manage keys in Clerk's UserProfile (API keys tab, enabled in the Clerk dashboard).
- **Convex bridge:** `authenticatedQuery`/`authenticatedMutation` (`convex/lib/auth.ts`) also accept optional `apiSecret` + `apiUserExternalId` args. `userQuery`/`userMutation` in `src/lib/public-api/convex.server.ts` fill them in, so every user function is callable from the API. Functions built with them must declare `args` (use `args: {}`), and callers without args pass `{}`.
- **Rate limits:** per-minute tiers in `src/lib/public-api/rate-limit.server.ts`, applied by `publicRoute` (per IP; pass `{ rateLimit: "search" }` for costly endpoints) and `userRoute` (per key owner, reads and writes separately). Update the docs' usage limits section when changing them.
- **Errors:** throw `notFound`/`invalid`/`conflict`/`forbidden` from `convex/lib/errors.ts` (typed `ConvexError`s) in Convex functions, so the API can map them to HTTP statuses; plain `Error` messages are hidden in production and become `500`.
- **Preference defaults:** creating a timeline, formation or PvP match fills in what the request leaves out from the user's preferences, like the editors do (`src/lib/public-api/preference-defaults.ts`). Keep this in the services so REST, MCP and Plana agree.
- **Docs:** `docs/api/yaak.json` (a Yaak export; import it into Yaak, edit, re-export) plus Markdown pages in `docs/api/pages/`, served by `@yaakdoc/next` at `/developers` (built into the gitignored `public/developers`). Update the export whenever endpoints change.

## MCP Server

Exposed at `/mcp` (streamable-http, Node.js runtime, SSE disabled). Published at `https://ba.joexyz.online/mcp`; user docs in `docs/api/pages/mcp.md`.

- **Tools mirror the public API 1:1** (`search_students`, `list_formations`, `update_pvp_match`, …). Route handlers and tools both call the services in `src/lib/public-api/resources/`, so put any new logic there, not in a route or a tool, and add the tool alongside the endpoint.
- **Every request needs OAuth.** `withMcpAuth(..., { required: true })` accepts only Clerk OAuth access tokens (`auth({ acceptsToken: "oauth_token" })`, in `src/lib/mcp/auth.server.ts`), never API keys. Clerk is the authorization server, with Client ID Metadata Documents (CIMD) on; `/.well-known/oauth-protected-resource/mcp` and `/.well-known/oauth-authorization-server` point clients to it.
- **Register tools with `defineTool`** (`src/lib/mcp/define-tool.ts`). It passes the signed-in user id, applies the per-user rate limits by `kind`, sets annotations, turns `ApiError`s into tool errors, and runs results through `src/lib/mcp/enrich.server.ts` (adds `…Label` in-game names beside enum fields and `name` to gift `{ id, count }` entries). Tool output only; the REST API keeps raw values.
- **Write-tool inputs come from Convex validators.** Mutation args live in `convex/lib/validators.ts` and are converted with `convexToZodShape` (`src/lib/mcp/convex-to-zod.ts`), so changing a mutation's args changes the tool schema too. Every field, nested ones included, needs a description in `src/lib/mcp/field-docs.ts`; `convexToZodShape`'s types fail the build on a missing one. Agents only learn what a field does from these, so say what it's for, its format and its limits.

## Plana AI

Chat page in `src/app/[locale]/plana-ai/`, with its route at `POST /api/plana-ai/chat` and the logic in `src/lib/ai/`. Users bring their own provider key (a cookie, `src/actions/plana-config.ts`).

- **Saving:** the client creates the chat and turn in Convex before sending. The route saves the reply in `onFinish` through the API bridge (`userMutation`), including partial replies after a Stop or a closed tab. `consumeSseStream` and `after()` are what let that finish once the browser has gone.
- **Tools:** `src/lib/ai/tools/index.server.ts` exposes every MCP tool automatically, by registering them on a stand-in server. `create_`, `update_` and `delete_` tools require approval in the chat and take an extra `change_summary` for the approval card. Plana-specific versions override a few of them there, for chat-sized output or safer behaviour (`update_roster` merges students instead of replacing the list). New read tools need labels under `tools.plana.tools.running` and `.done`.
- **Messages:** replies keep a `[expression: x]` marker in their text, which the client strips and uses to animate Plana. Only text and a compact tool summary are stored (`planaToolPart`), and past turns reach the model as text only.

## Production Deployment

`vercel-deploy.sh` runs `convex deploy --cmd 'pnpm run build'` (only when `VERCEL_ENV=production`). Convex deploy is bundled with the Next.js build on Vercel.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
