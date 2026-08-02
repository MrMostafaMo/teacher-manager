use tauri_plugin_sql::{Migration, MigrationKind};

/// SQL migrations embedded into the binary. drizzle-kit generates these files
/// (see `drizzle/`), `scripts/sync-migrations.mjs` copies them into
/// `src-tauri/migrations/`, and the SQL plugin applies pending migrations
/// automatically on first launch — this is what auto-initializes the database.
///
/// ponytail: ordered list; add one entry per synced migration file.
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("../migrations/0000_optimal_alex_power.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:teacher-manager.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
