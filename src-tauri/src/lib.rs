use tauri_plugin_sql::{Migration, MigrationKind};

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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
