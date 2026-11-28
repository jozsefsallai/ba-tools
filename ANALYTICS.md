# Analytics

This page lists everything Joe's Blue Archive Tools records about how the site is used: what is sent, when, and what it's for. It's the detailed version of the analytics part of our [Privacy Policy](https://nimblebun.works/en/privacy).

We use [PostHog](https://posthog.com) (US cloud) for product analytics and error tracking. The setup is in `src/lib/analytics/posthog.client.ts`, and every event below is declared in `src/lib/analytics/events.ts`. The code only accepts events and properties listed there.

## The ground rules

- **Not linked to your account.** Events are never tied to your Joe's Blue Archive Tools account, your name or your email address. We don't call PostHog's `identify`, and we don't create person profiles. Events carry only a random analytics identifier stored in your browser.
- **Nothing you write.** No event contains text you typed or created. That covers names and titles of timelines, formations, rosters, inventories and accounts, notes, friend codes, opponent names, search queries, Plana AI messages and replies, and API keys. Ids of your saved items aren't sent either. Properties hold only settings, counts, durations, yes/no values and game data ids (students, items, missions).
- **No session recordings, heatmaps or surveys.**
- **You decide.**
  - Analytics are off until you turn them on. Wherever you are, nothing is recorded or stored until you allow it in the banner.
  - You can change your mind at any time from the **Analytics** link in the footer, or from **Preferences** in the user menu.
  - The change applies to that browser straight away. Content blockers can also block PostHog, since we connect to it directly rather than through our own domain.

## Sent with every event

PostHog adds these to every event, including the ones it captures automatically:

- the analytics identifier and a session identifier;
- the page URL and path, and the referrer. Sign-in tokens (`__clerk*`, `code`, `state`, `*token*`, `*ticket*`) are removed from URLs, and so are ad click ids such as `gclid` and `fbclid`. Campaign (`utm_*`) parameters are kept;
- browser, operating system, device type, browser language, and screen and window size;
- approximate location (country, region, city), which PostHog works out from your IP address.

## Captured automatically

| Event                      | When                                                                                                                                                                                                                     | Used for                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `$pageview` / `$pageleave` | You open or leave a page, including in-app navigation                                                                                                                                                                    | Which tools are used, and how people move between them                    |
| `$autocapture`             | You click a link or button, submit a form, or change a control. It records the element's type, its label text and its position on the page; values typed into inputs are never included. Not captured on Plana AI pages. | Which buttons and options people use, without adding an event to each one |
| `$rageclick`               | Repeated clicks on the same spot                                                                                                                                                                                         | Finding buttons that look clickable but don't respond                     |
| `$exception`               | An error isn't handled in the page. Includes the error message and stack trace, which can sometimes contain fragments of what was on the page.                                                                           | Error tracking: finding and fixing bugs                                   |
| `$web_vitals`              | A page finishes loading                                                                                                                                                                                                  | How fast pages load and respond                                           |

## Product events

These are sent when an action succeeds: after a save goes through, or when a download starts. Properties marked _nullable_ can be `null` when they don't apply.

### Site-wide

| Event               | When                                                                                  | Properties                              | Used for                                |
| ------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------- |
| `theme_changed`     | You pick a theme                                                                      | `theme`: `light`, `dark` or `system`    | Which themes people prefer              |
| `locale_changed`    | You switch language                                                                   | `from`, `to`: locale codes (`en`, `ja`) | How much each translation is used       |
| `signed_in`         | You sign in while the site is open. Isn't sent for pages that load already signed in. | none                                    | How many sessions sign in               |
| `preferences_saved` | You save your preferences                                                             | none                                    | Whether people use the preferences page |

### Timelines

| Event                          | When                                            | Properties                                                                                                                                                                            | Used for                                                      |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `timeline_saved`               | You save a timeline (new or existing)           | `is_new`; `item_count`; `visibility` (`public`/`private`); `visibility_changed`; `show_creator`; `raid_type`, `raid_boss`, `raid_difficulty` (game values, nullable); `has_formation` | How timelines are built and shared, and for which raids       |
| `timeline_saved_locally`       | Signed out, you save a timeline to your browser | `item_count`                                                                                                                                                                          | How much the editor is used without an account                |
| `timeline_image_exported`      | A timeline image download starts                | `source` (`editor`/`view`); `scale`; `transparent_background`; `include_formation`; `item_count`; `raid_type` (nullable)                                                              | Which export options matter                                   |
| `timeline_image_export_failed` | A timeline image couldn't be generated          | `source`                                                                                                                                                                              | Finding export bugs                                           |
| `timeline_imported`            | You import a timeline                           | `source` (`image`/`json`/`text`); `item_count`; `unresolved_count` (text imports: students it couldn't recognise)                                                                     | Which import methods are used, and how well text import works |
| `timeline_import_failed`       | An image or JSON import fails                   | `source` (`image`/`json`); `reason` (`no_data`/`invalid`)                                                                                                                             | Finding import problems                                       |
| `timeline_link_copied`         | You copy a timeline's link                      | none                                                                                                                                                                                  | How often timelines are shared                                |
| `timeline_text_copied`         | You copy a timeline as text                     | `source` (`editor`/`view`); `item_count`                                                                                                                                              | Whether the text format is used                               |
| `timeline_deleted`             | You delete a timeline                           | `visibility`; `from_group`                                                                                                                                                            | Usage over time                                               |
| `timeline_group_saved`         | You create or save a timeline group             | `is_new`; `timeline_count` (0 for a new group); `visibility`; `show_creator`; `raid_type` (nullable)                                                                                  | How groups are used                                           |
| `timeline_group_link_copied`   | You copy a group's link                         | none                                                                                                                                                                                  | How often groups are shared                                   |

### Formations

| Event                        | When                                       | Properties                                                                                                                           | Used for                                |
| ---------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `formation_saved`            | You save a formation                       | `is_new`; `source` (`formation_display`/`timeline_editor`); `formation_type` (nullable); `row_count`; `student_count` (filled slots) | How formations are built, and where     |
| `formation_image_exported`   | A formation image download starts          | `source`; `scale`                                                                                                                    | Which export settings are used          |
| `formation_echelon_imported` | You import an echelon from the game's data | `striker_count`; `special_count`                                                                                                     | Whether echelon import works for people |
| `formation_deleted`          | You delete a formation                     | `formation_type` (nullable); `row_count`                                                                                             | Usage over time                         |

### Rosters

| Event                                 | When                                                              | Properties                                                                                                             | Used for                                       |
| ------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `roster_saved`                        | You create or save a roster                                       | `is_new`; `visibility`; `game_server`; `student_count` and `featured_count` (0 for a new roster); `has_representative` | How rosters are kept, and on which servers     |
| `roster_link_copied`                  | You copy a roster's link                                          | `source` (`editor`/`public_view`)                                                                                      | How often rosters are shared                   |
| `roster_image_copied`                 | You copy a roster's card image                                    | none                                                                                                                   | Whether the card image is useful               |
| `roster_friend_code_copied`           | You copy a friend code from a roster. The code itself isn't sent. | none                                                                                                                   | Whether public rosters help people add friends |
| `roster_imported` / `roster_exported` | You import or export a roster in Justin Planner's format          | `format` (`justin`); `student_count`                                                                                   | How much people move data between planners     |

### PvP

| Event                                                                                 | When                                                                   | Properties                                                                                                                                                              | Used for                                                       |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `pvp_match_saved`                                                                     | You record or edit a match                                             | `is_new`; `match_type` (`attack`/`defense`); `result` (`win`/`loss`); `include_in_statistics`; `has_video`; `from_combat_report`; `own_team_size`; `opponent_team_size` | How matches are logged, and how many go into public statistics |
| `pvp_match_save_failed`                                                               | Saving a match fails                                                   | `is_new`                                                                                                                                                                | Finding save problems                                          |
| `pvp_match_deleted`                                                                   | You delete a match                                                     | `match_type`; `result`                                                                                                                                                  | Usage over time                                                |
| `pvp_combat_report_imported`                                                          | A combat report screenshot is read                                     | `source` (`match_editor`/`stats_search`); `battle_type` (`ATTACK`, `DEFENSE` or `unknown`); `unresolved_count` (units it couldn't recognise)                            | How well screenshot reading works                              |
| `pvp_screenshots_imported`                                                            | A batch screenshot import ends                                         | `screenshot_count`; `imported_count`; `failed_count`; `skipped_count`; `assisted_mode`; `include_in_statistics`; `aborted`                                              | How reliable batch import is                                   |
| `pvp_matches_bulk_imported`                                                           | You import matches from a JSON file                                    | `match_count`; `replace_existing`                                                                                                                                       | Whether bulk import is used                                    |
| `pvp_season_saved`                                                                    | You create or edit a season                                            | `is_new`; `game_server`; `season_number`                                                                                                                                | Which servers and seasons are tracked                          |
| `pvp_season_archived`                                                                 | You archive or unarchive a season                                      | `archived`                                                                                                                                                              | Whether archiving is used                                      |
| `pvp_formation_preset_saved`                                                          | You save a formation preset                                            | `is_new`; `source` (`match_editor`/`preset_form`); `match_type`; `student_count`                                                                                        | How presets are used                                           |
| `pvp_formation_preset_deleted`                                                        | You delete a formation preset                                          | none                                                                                                                                                                    | Usage over time                                                |
| `pvp_enemy_preset_saved`                                                              | You save an opponent preset                                            | `is_new`; `source`; `has_representative`                                                                                                                                | How opponent tracking is used                                  |
| `pvp_enemy_preset_deleted`, `pvp_enemy_preset_anonymized`, `pvp_enemy_presets_merged` | You delete, anonymize or merge opponent presets                        | none                                                                                                                                                                    | Which management actions are needed                            |
| `pvp_enemy_team_saved`                                                                | You save an opponent team                                              | `is_new`; `match_type`; `student_count`                                                                                                                                 | How opponent teams are recorded                                |
| `pvp_enemy_team_deleted`                                                              | You delete an opponent team                                            | none                                                                                                                                                                    | Usage over time                                                |
| `pvp_stats_searched`                                                                  | You search the public PvP statistics (not searches opened from a link) | `season_number`; `defense_student_ids` (the defense team's student ids); `excluded_count`                                                                               | Which defense teams people look up, to improve the statistics  |
| `pvp_stats_link_copied`                                                               | You copy a link to a statistics search                                 | `season_number`                                                                                                                                                         | How often searches are shared                                  |

### Bond and gifts

| Event                    | When                                      | Properties                                                 | Used for                                                                  |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `bond_student_selected`  | You pick a student in the bond calculator | `student_id`; `prefilled_from_roster`                      | Which students people plan bond for, and whether the roster prefill helps |
| `gift_inventory_created` | You create a gift inventory               | `gift_type_count` (gift types you have); `gift_boxes_used` | How inventories are set up                                                |
| `gift_inventory_saved`   | You save a gift inventory                 | `target_count`; `source` (`button`/`leave_prompt`)         | How often the leave-page reminder saves work                              |
| `gift_inventory_deleted` | You delete a gift inventory               | `target_count`                                             | Usage over time                                                           |
| `gift_target_created`    | You add a bond target                     | `student_id`; `current_rank`; `target_rank`                | Which bond ranks people aim for                                           |
| `gift_target_deleted`    | You remove a bond target                  | `student_id` (nullable)                                    | Usage over time                                                           |

### Students

| Event                              | When                                                                                       | Properties                                | Used for                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------ |
| `student_sprite_copied`            | You copy a student's sprite image                                                          | `student_id`; `variant` (sprite key, prefixed with the other student's or outfit's id for sprites from the rest of the family) | Which sprites people use                   |
| `memorial_lobby_started`           | You start a memorial lobby from its poster. Lobbies that play on their own aren't counted. | `student_id`; `lobby_index`               | How much the memorial lobby viewer is used |
| `memorial_lobby_screenshot_copied` | You copy a memorial lobby screenshot                                                       | `student_id`; `lobby_index`; `fullscreen` | Whether screenshots are useful             |

### Inventory management simulator

| Event                                                | When                           | Properties                                                                              | Used for                                                   |
| ---------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `inventory_simulation_completed`                     | A simulation finishes          | `failed`; `preset_id` and `round_index` (nullable); `blocked_cell_count`; `duration_ms` | How long simulations take, and which presets are simulated |
| `inventory_preset_loaded`                            | You load an event preset       | `preset_id`; `round_index`; `source` (`recommended`/`dialog`/`next_round`/`url`)        | Which presets and entry points are used                    |
| `inventory_preset_link_copied`                       | You copy a preset's link       | `preset_id`                                                                             | How often presets are shared                               |
| `inventory_layout_saved` / `inventory_layout_loaded` | You save or load a layout slot | `slot`; for loads, `source` (`button`/`url`)                                            | Whether save slots are used                                |

### Inventory scanner

Screenshots and recordings are read in your browser and never uploaded. Only the counts below are sent.

| Event                      | When                                          | Properties                                                                                                                                                                  | Used for                                           |
| -------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `inventory_scan_completed` | A batch of screenshots or recordings is read  | `screenshot_count`; `video_count`; `frame_count`; `failed_count`; `failed_video_count`; `item_count`; `recognized_count`; `to_check_count`; `unknown_count`; `read_nothing` | How accurate the scanner is, and which inputs fail |
| `inventory_scan_exported`  | You download or copy the result for a planner | `exporter` (e.g. `justin-planner`); `method` (`download`/`copy`); `item_count`; `supported_count`                                                                           | Which planners to support                          |

### Missions

| Event                  | When                           | Properties                      | Used for                             |
| ---------------------- | ------------------------------ | ------------------------------- | ------------------------------------ |
| `mission_map_copied`   | You copy a mission's map image | `mission` (label, e.g. `25-3H`) | Which missions people need help with |
| `mission_route_played` | You play a route's animation   | `mission`; `route` (route kind) | Which routes are useful              |

### Railroad puzzle solver

| Event                    | When                                                                                                                                                    | Properties                                                                                                                                                                                                                                      | Used for                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `railroad_puzzle_solved` | The solver runs: when you press Solve, each time it re-solves as you edit (with "solve instantly" on), or when you find the minimal rail configurations | `puzzle` (preset name); `mode` (`solve`/`min_configs`); `trigger` (`button`/`auto`); `solved`; `result_count`; `duration_ms` (how long the solver took); `straight_rails`, `slightly_curved_rails`, `very_curved_rails` (rails available to it) | Which puzzles and rail combinations make the solver slow, and whether it finds answers |
| `railroad_aoba_started`  | You send Aoba down the track                                                                                                                            | `puzzle`                                                                                                                                                                                                                                        | Whether people enjoy it                                                                |

### Recruitment tracker

| Event                          | When                                | Properties                                                                                                        | Used for                  |
| ------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `recruitment_account_saved`    | You create or edit an account       | `is_new`; `game_server`                                                                                           | Which servers are tracked |
| `recruitment_account_deleted`  | You delete an account               | none                                                                                                              | Usage over time           |
| `recruitment_account_archived` | You archive or unarchive an account | `archived`                                                                                                        | Whether archiving is used |
| `recruitment_session_saved`    | You save a recruitment session      | `is_new`; `fest_banner`; `permanent_pulls`; `limited_pulls`; `free_pulls`; `three_star_count`; `pickups_obtained` | How recruitment is logged |
| `recruitment_session_deleted`  | You delete a session                | none                                                                                                              | Usage over time           |

### Scenario image generator

| Event                     | When                                                                                        | Properties                                                                                             | Used for             |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------- |
| `scenario_image_exported` | You copy or download an image                                                               | `method` (`copy`/`download`); `character_count`; `has_background`; `transparent_background`; `animate` | Which options matter |
| `scenario_script_played`  | You play a script. Scripts aren't available on the live site yet, so this isn't sent there. | `event_count`; `character_count`                                                                       | Script feature usage |

### Title generator

| Event             | When                                                                                                | Properties | Used for                          |
| ----------------- | --------------------------------------------------------------------------------------------------- | ---------- | --------------------------------- |
| `title_generated` | A title image is generated after you change something (not the first one shown when the page opens) | `mode`     | Which kinds of titles people make |

### Plana AI

Chats aren't autocaptured; only these events are sent. Message text, replies, chat titles, tool details and your API key or model name are never included.

| Event                                       | When                                             | Properties                                                                                                                                                  | Used for                                      |
| ------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `plana_message_sent`                        | You send a message                               | `is_new_chat`; `source` (`composer`/`suggestion`); `suggestion` (which suggestion, nullable); `message_count` (messages already in the chat)                | How Plana is used, and which suggestions work |
| `plana_reply_finished`                      | A reply ends                                     | `outcome` (`completed`, `stopped`, `disconnected`, `error`, `empty` or `filtered`); `finish_reason` (nullable); `tool_call_count`; `duration_ms` (nullable) | Reply reliability and speed                   |
| `plana_reply_failed`                        | An error is shown                                | `error_code` (e.g. `invalid_key`, `rate_limited`, `no_credits`)                                                                                             | Which errors people run into                  |
| `plana_reply_regenerated`                   | You regenerate or retry a reply                  | `source` (`button`/`retry`)                                                                                                                                 | How often replies need another go             |
| `plana_message_edited`                      | You edit a message                               | none                                                                                                                                                        | Whether editing is used                       |
| `plana_chat_rewound`                        | You rewind a chat                                | `removed_count`                                                                                                                                             | Whether rewinding is used                     |
| `plana_tool_approval`                       | You approve or deny a change Plana wants to make | `tool` (e.g. `create_formation`); `verb` (`create`/`update`/`delete`); `approved`                                                                           | Which actions people trust Plana with         |
| `plana_chat_deleted` / `plana_chat_renamed` | You delete or rename a chat                      | none                                                                                                                                                        | Chat management usage                         |
| `plana_config_saved`                        | You save Plana's provider settings               | `provider` (`openrouter`/`gateway`); `key_changed`; `provider_changed`; `uses_custom_model`                                                                 | Which providers people use                    |
| `plana_config_cleared`                      | You remove Plana's settings                      | none                                                                                                                                                        | Usage over time                               |

## Not tracked

- Calculators that update as you type (raid score, student EXP, gacha rate stats). Only their pageviews and clicks are recorded.
- Admin pages, beyond the automatic events.
- The server, the public API (`/api/v1`) and the MCP server don't send analytics events. Requests there are only kept in hosting logs and rate-limit counters, as the Privacy Policy describes.

## Retention

PostHog keeps analytics and error data as long as our project's retention settings allow, and no longer than 24 months.

## Changing this list

New events go in `src/lib/analytics/events.ts` first, then on this page.
