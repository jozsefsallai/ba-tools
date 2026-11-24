---

title: Changelog
description: Changes to the API.
icon: history
---

## v1 (2026-11)

- `GET /api/v1/calculators/raid-score` (and `calculate_raid_score`) works out Total Assault and Grand Assault scores and clear times. `GET /api/v1/calculators/student-exp` (and `calculate_student_exp`) works out how many students your Activity Reports can raise.
- Gift targets accept `currentRank` and `currentRankExp` (the EXP within the rank) instead of the total `currentExp`, and updates accept `addExp` to add to the saved EXP.
- `GET /api/v1/bond-ranks` (and `list_bond_ranks`) lists the EXP each bond rank needs.
- `GET /api/v1/me/gift-inventories` (and `list_gift_inventories`) includes a summary of each inventory's `targets`.
- Gift targets (`/api/v1/me/gift-inventories/:id` and its `targets`, and the matching MCP tools) include `progress`: the current bond rank and EXP, the EXP needed for the next rank and the target, and where the planned gifts get you. Single targets also list ways to gain the missing EXP.
- `GET /api/v1/missions` (and `list_missions`) lists the campaign missions with their drops, and can find where an item drops. `GET /api/v1/missions/:label` (and `get_mission`) gets a campaign mission with its drops, enemies and the fewest-turn routes that clear it, turn by turn, plus a picture of its map (`mapImageUrl`).
- `GET /api/v1/students/:id` (and `get_student`) lists the student's relationship story in `bondStories`: each episode's titles, the bond rank it unlocks at, and whether it unlocks the memorial lobby or the bond gear.
- Story items in `GET /api/v1/roadmap` have a `label` (`Act 2, Volume 2, Chapter 1, Part 1`, or `null`); `name` is the chapter's title.
- Creating a timeline, formation or PvP match now uses your preferences for the settings you leave out, and `includeInStatistics` is optional when recording a match.
- `GET /api/v1/students` and raid `defenseTypes` accept attack and defense types by color (`red`, `yellow`, `blue`, `purple`, `green`).
- `GET /api/v1/roadmap` can be filtered with `categories`, `from` and `to`.
- First version of the public API: game data, shared content, PvP statistics, and full access to your own data with API keys.
- [MCP server](./mcp.md) at `/mcp` with a tool for every API operation. It requires signing in with OAuth.
