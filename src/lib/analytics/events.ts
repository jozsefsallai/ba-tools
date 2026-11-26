// Every product analytics event and its properties. ANALYTICS.md documents
// them for users; keep the two in sync.
//
// Properties never hold user-written text (names, notes, messages, friend
// codes, search queries) or ids of the user's own items. Game data ids
// (students, items, missions) and settings are fine.

type Visibility = "public" | "private";

type Theme = "light" | "dark" | "system";

export interface AnalyticsEvents {
  // App
  theme_changed: {
    theme: Theme;
  };

  locale_changed: {
    from: string;
    to: string;
  };

  signed_in: undefined;

  preferences_saved: undefined;

  // Timelines
  timeline_saved: {
    is_new: boolean;
    item_count: number;
    visibility: Visibility;
    visibility_changed: boolean;
    show_creator: boolean;
    raid_type: string | null;
    raid_boss: string | null;
    raid_difficulty: string | null;
    has_formation: boolean;
  };

  timeline_saved_locally: {
    item_count: number;
  };

  timeline_image_exported: {
    source: "editor" | "view";
    scale: number;
    transparent_background: boolean;
    include_formation: boolean;
    item_count: number;
    raid_type: string | null;
  };

  timeline_image_export_failed: {
    source: "editor" | "view";
  };

  timeline_imported: {
    source: "image" | "json" | "text";
    item_count: number;
    unresolved_count?: number;
  };

  timeline_import_failed: {
    source: "image" | "json";
    reason: "no_data" | "invalid";
  };

  timeline_link_copied: undefined;

  timeline_text_copied: {
    source: "editor" | "view";
    item_count: number;
  };

  timeline_deleted: {
    visibility: Visibility;
    from_group: boolean;
  };

  timeline_group_saved: {
    is_new: boolean;
    timeline_count: number;
    visibility: Visibility;
    show_creator: boolean;
    raid_type: string | null;
  };

  timeline_group_link_copied: undefined;

  // Formations
  formation_saved: {
    is_new: boolean;
    source: "formation_display" | "timeline_editor";
    formation_type: string | null;
    row_count: number;
    student_count: number;
  };

  formation_image_exported: {
    source: "formation_display" | "timeline_editor";
    scale: number;
  };

  formation_echelon_imported: {
    striker_count: number;
    special_count: number;
  };

  formation_deleted: {
    formation_type: string | null;
    row_count: number;
  };

  // Rosters
  roster_saved: {
    is_new: boolean;
    visibility: Visibility;
    game_server: string;
    student_count: number;
    featured_count: number;
    has_representative: boolean;
  };

  roster_link_copied: {
    source: "editor" | "public_view";
  };

  roster_image_copied: undefined;

  roster_friend_code_copied: undefined;

  roster_imported: {
    format: "justin";
    student_count: number;
  };

  roster_exported: {
    format: "justin";
    student_count: number;
  };

  // PvP
  pvp_match_saved: {
    is_new: boolean;
    match_type: string;
    result: string;
    include_in_statistics: boolean;
    has_video: boolean;
    from_combat_report: boolean;
    own_team_size: number;
    opponent_team_size: number;
  };

  pvp_match_save_failed: {
    is_new: boolean;
  };

  pvp_match_deleted: {
    match_type: string;
    result: string;
  };

  pvp_combat_report_imported: {
    source: "match_editor" | "stats_search";
    battle_type: string;
    unresolved_count: number;
  };

  pvp_screenshots_imported: {
    screenshot_count: number;
    imported_count: number;
    failed_count: number;
    skipped_count: number;
    assisted_mode: boolean;
    include_in_statistics: boolean;
    aborted: boolean;
  };

  pvp_matches_bulk_imported: {
    match_count: number;
    replace_existing: boolean;
  };

  pvp_season_saved: {
    is_new: boolean;
    game_server: string;
    season_number: number;
  };

  pvp_season_archived: {
    archived: boolean;
  };

  pvp_formation_preset_saved: {
    is_new: boolean;
    source: "match_editor" | "preset_form";
    match_type: string;
    student_count: number;
  };

  pvp_formation_preset_deleted: undefined;

  pvp_enemy_preset_saved: {
    is_new: boolean;
    source: "match_editor" | "preset_form";
    has_representative: boolean;
  };

  pvp_enemy_preset_deleted: undefined;

  pvp_enemy_preset_anonymized: undefined;

  pvp_enemy_presets_merged: undefined;

  pvp_enemy_team_saved: {
    is_new: boolean;
    match_type: string;
    student_count: number;
  };

  pvp_enemy_team_deleted: undefined;

  pvp_stats_searched: {
    season_number: number;
    defense_student_ids: string[];
    excluded_count: number;
  };

  pvp_stats_link_copied: {
    season_number: number;
  };

  // Bond / gifts
  bond_student_selected: {
    student_id: string;
    prefilled_from_roster: boolean;
  };

  gift_inventory_created: {
    gift_type_count: number;
    gift_boxes_used: number;
  };

  gift_inventory_saved: {
    target_count: number;
    source: "button" | "leave_prompt";
  };

  gift_inventory_deleted: {
    target_count: number;
  };

  gift_target_created: {
    student_id: string;
    current_rank: number;
    target_rank: number;
  };

  gift_target_deleted: {
    student_id: string | null;
  };

  // Students
  student_sprite_copied: {
    student_id: string;
    variant: string;
  };

  memorial_lobby_started: {
    student_id: string;
    lobby_index: number;
  };

  memorial_lobby_screenshot_copied: {
    student_id: string;
    lobby_index: number;
    fullscreen: boolean;
  };

  // Inventory management
  inventory_simulation_completed: {
    failed: boolean;
    preset_id: string | null;
    round_index: number | null;
    blocked_cell_count: number;
    duration_ms: number;
  };

  inventory_preset_loaded: {
    preset_id: string;
    round_index: number;
    source: "recommended" | "dialog" | "next_round" | "url";
  };

  inventory_preset_link_copied: {
    preset_id: string;
  };

  inventory_layout_saved: {
    slot: string;
  };

  inventory_layout_loaded: {
    slot: string;
    source: "button" | "url";
  };

  // Inventory scanner
  inventory_scan_completed: {
    screenshot_count: number;
    video_count: number;
    frame_count: number;
    failed_count: number;
    failed_video_count: number;
    item_count: number;
    recognized_count: number;
    to_check_count: number;
    unknown_count: number;
    read_nothing: boolean;
  };

  inventory_scan_exported: {
    exporter: string;
    method: "download" | "copy";
    item_count: number;
    supported_count: number;
  };

  // Missions
  mission_map_copied: {
    mission: string;
  };

  mission_route_played: {
    mission: string;
    route: string;
  };

  // Railroad puzzle solver
  railroad_puzzle_solved: {
    puzzle: string;
    mode: "solve" | "min_configs";
    trigger: "button" | "auto";
    solved: boolean;
    result_count: number;
    duration_ms: number;
    straight_rails: number;
    slightly_curved_rails: number;
    very_curved_rails: number;
  };

  railroad_aoba_started: {
    puzzle: string;
  };

  // Recruitment tracker
  recruitment_account_saved: {
    is_new: boolean;
    game_server: string;
  };

  recruitment_account_deleted: undefined;

  recruitment_account_archived: {
    archived: boolean;
  };

  recruitment_session_saved: {
    is_new: boolean;
    fest_banner: boolean;
    permanent_pulls: number;
    limited_pulls: number;
    free_pulls: number;
    three_star_count: number;
    pickups_obtained: number;
  };

  recruitment_session_deleted: undefined;

  // Scenario image generator
  scenario_image_exported: {
    method: "copy" | "download";
    character_count: number;
    has_background: boolean;
    transparent_background: boolean;
    animate: boolean;
  };

  scenario_script_played: {
    event_count: number;
    character_count: number;
  };

  // Title generator
  title_generated: {
    mode: string;
  };

  // Plana AI
  plana_message_sent: {
    is_new_chat: boolean;
    source: "composer" | "suggestion";
    suggestion: string | null;
    message_count: number;
  };

  plana_reply_finished: {
    outcome:
      | "completed"
      | "stopped"
      | "disconnected"
      | "error"
      | "empty"
      | "filtered";
    finish_reason: string | null;
    tool_call_count: number;
    duration_ms: number | null;
  };

  plana_reply_failed: {
    error_code: string;
  };

  plana_reply_regenerated: {
    source: "button" | "retry";
  };

  plana_message_edited: undefined;

  plana_chat_rewound: {
    removed_count: number;
  };

  plana_tool_approval: {
    tool: string;
    verb: string;
    approved: boolean;
  };

  plana_chat_deleted: undefined;

  plana_chat_renamed: undefined;

  plana_config_saved: {
    provider: string;
    key_changed: boolean;
    provider_changed: boolean;
    uses_custom_model: boolean;
  };

  plana_config_cleared: undefined;
}

export type AnalyticsEventName = keyof AnalyticsEvents;

export type AnalyticsEventArgs<E extends AnalyticsEventName> =
  AnalyticsEvents[E] extends undefined
    ? []
    : [
        AnalyticsEvents[E],
      ];
