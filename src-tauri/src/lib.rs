use tauri_plugin_sql::{Migration, MigrationKind};

mod oauth;

/// SQL migrations embedded into the binary. drizzle-kit generates these files
/// (see `drizzle/`), `scripts/sync-migrations.mjs` copies them into
/// `src-tauri/migrations/`, and the SQL plugin applies pending migrations
/// automatically on first launch — this is what auto-initializes the database.
///
/// ponytail: ordered list; add one entry per synced migration file.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init",
            sql: include_str!("../migrations/0000_optimal_alex_power.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "core schema",
            sql: include_str!("../migrations/0001_tiny_young_avengers.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "attendance per student per date",
            sql: include_str!("../migrations/0002_fat_fantastic_four.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "student subscription plan",
            sql: include_str!("../migrations/0003_condemned_sumo.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "recurring weekly group sessions (timetable)",
            sql: include_str!("../migrations/0004_nasty_ulik.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "per-session attendance sheets",
            sql: include_str!("../migrations/0005_calm_punisher.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "expenses (outgoing costs)",
            sql: include_str!("../migrations/0006_purple_multiple_man.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "monthly session plans per group + per-group sessions-per-month",
            sql: include_str!("../migrations/0007_kind_scalphunter.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "remove monthly session plans (rolled back)",
            sql: include_str!("../migrations/0008_brave_hobgoblin.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "group weekly-session start date",
            sql: include_str!("../migrations/0009_aspiring_daimon_hellstrom.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "student enrollment date (backfilled from created_at)",
            sql: include_str!("../migrations/0010_slow_the_stranger.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "per-occurrence schedule exceptions (cancel/move)",
            sql: include_str!("../migrations/0011_odd_triton.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "notifications",
            sql: include_str!("../migrations/0012_nasty_major_mapleleaf.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "weak_points",
            sql: include_str!("../migrations/0013_absurd_kat_farrell.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "sync_meta, sync_tombstones + delete triggers",
            sql: include_str!("../migrations/0014_strong_stranger.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "drop legacy study_groups.schedule column",
            sql: include_str!("../migrations/0015_drop_group_schedule.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "student birth_date, grade_level, photo_url; student_groups.joined_at",
            sql: include_str!("../migrations/0016_student_schema_enhancement.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "study_groups.max_students capacity limit",
            sql: include_str!("../migrations/0017_group_capacity.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:teacher-manager.db", migrations())
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![oauth::start_oauth_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
