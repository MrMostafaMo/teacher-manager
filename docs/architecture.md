# Architecture

This document records the architectural decisions of Teacher Manager. It is
updated as features land.

## Principles

- **Clean architecture / SOLID** — UI, application logic and persistence are
  separated and depend on interfaces, not implementations.
- **Feature-based modularity** — each feature is independently maintainable
  and testable.
- **DDD where appropriate** — domain types and business rules live apart from
  framework code.
- **Offline first** — no network dependency at runtime; fonts, assets and data
  are all local.

## Layering

```
┌────────────────────────────────────────────────────────┐
│ ui/         React components, forms, tables             │
├────────────────────────────────────────────────────────┤
│ application/  use cases / services (business rules)     │
├────────────────────────────────────────────────────────┤
│ domain/      entities, Zod schemas, value objects       │
├────────────────────────────────────────────────────────┤
│ infrastructure/  Drizzle repositories (implementations) │
├────────────────────────────────────────────────────────┤
│ db/          client.ts (proxy driver) + migrations      │
└────────────────────────────────────────────────────────┘
```

Feature module convention (`src/features/<feature>/`):

| Path              | Contents                                                     |
| ----------------- | ------------------------------------------------------------ |
| `domain.ts`       | Drizzle entity types + Zod schemas (framework-free, no React) |
| `application/`    | Pure use-case functions; validate input, apply rules, call repo interfaces, write activity log |
| `infrastructure/` | Concrete Drizzle repository implementing the feature's repository interface |
| `ui/`             | React components, forms, TanStack tables                     |

Cross-cutting concerns (activity log, i18n, theme, backup) live under
`src/lib/` and are consumed by feature use-cases.

## Database

### Connectivity

- The Tauri **SQL plugin** (`@tauri-apps/plugin-sql`) owns the SQLite file
  (`sqlite:teacher-manager.db`) and executes every statement in Rust with
  parameterized binds — **no SQL injection surface** (queries are also built
  exclusively through Drizzle query builders).
- Drizzle runs in the frontend through the **`sqlite-proxy` driver**
  (`src/lib/db/client.ts`), mapping `run|all|values|get` to the plugin's
  `execute`/`select`.

### Initialization

1. `drizzle-kit generate` emits SQL from `src/lib/db/schema.ts` into `drizzle/`.
2. `scripts/sync-migrations.mjs` copies them into `src-tauri/migrations/`
   (stripping drizzle-kit breakpoint comments).
3. The files are embedded with `include_str!` and registered via the plugin's
   `add_migrations` in `src-tauri/src/lib.rs`.
4. On first launch the plugin applies pending migrations automatically —
   **the database self-initializes**, tracked in `_sqlx_migrations`.

### Conventions

- Every table: `id` TEXT UUID PK, `created_at` / `updated_at` INTEGER unix-ms.
- Timestamps are set by repositories (the SQL plugin cannot use
  `CURRENT_TIMESTAMP` in prepared statements).
- UUIDs are v4 strings generated in the application layer.

## Security

- Parameterized queries only (plugin + Drizzle).
- Zod validation at every trust boundary (form input, use-case arguments).
- Tauri **capabilities** restrict IPC: the frontend is granted
  `sql:default` + `sql:allow-execute`; more plugins (dialog/fs) are scoped
  when introduced.
- CSP is currently `null` for development; tightened in the Phase 12 polish.

## Arabic / RTL

- `html[dir]`/`html[lang]` derive from the persisted language
  (`src/lib/i18n/language-store.ts`), applied pre-paint in `index.html` and
  `main.tsx` (no flash).
- All layout uses **logical CSS properties** (`ms-`, `me-`, `ps-`, `pe-`,
  `text-start/end`) so every component mirrors under RTL automatically.
- Numbers force `numberingSystem: "latn"` in both locales
  (`src/lib/utils/format.ts`).

## TODO

- [ ] Activity log service — implements a `logActivity(action, entity, refs)`
      API; every mutation use-case calls it (Phase 2).
- [ ] Error boundary + friendly error dialogs (Phase 2/12).
- [ ] Backup/restore closes the DB pool, copies the file, then reloads (Phase 11).
- [ ] Database export + restore UI (Phase 11).
- [ ] Tighten CSP (Phase 12).
