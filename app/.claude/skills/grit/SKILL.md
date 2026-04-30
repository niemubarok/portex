---
name: grit
description: >
  Grit framework conventions and patterns for this double project.
  Use when modifying models, handlers, routes, schemas, types, or components.
  Automatically loaded as background knowledge.
user-invocable: false
---

# Grit Framework — Double (Web + API) + TanStack Router (Vite)

This project uses a **double** architecture: Go API + React web frontend in a Turborepo monorepo. Two apps that share types and schemas.

It uses **TanStack Router** (Vite) for the frontend — SPA with file-based routing, fast HMR, smaller bundles.

**Batteries included:** file storage (S3), email (Resend), background jobs (asynq), cron, Redis cache, AI (Vercel AI Gateway), security (Sentinel), observability (Pulse), auto-generated API docs (gin-docs).

For detailed API conventions, code patterns, and service documentation, see [reference.md](reference.md).

---

## CLI Commands

`ash
# Code generation
grit generate resource Post --fields "title:string,content:text,published:bool"
grit generate resource Post --from post.yaml
grit remove resource Post               # Cleanly removes all generated files + injections

# Development
grit start                            # Start dev servers
grit sync                             # Go types → TypeScript
grit add role MODERATOR               # Injects role into 7 locations
grit migrate                          # Run GORM AutoMigrate
grit seed                             # Create admin + demo users

# Operations
grit routes                           # List all API routes
grit down                             # Enable maintenance mode (503)
grit up                               # Disable maintenance mode
grit deploy --host user@server --domain myapp.com  # Production deploy

# Updates
grit upgrade                          # Update project to latest templates
grit update                           # Update Grit CLI itself
`

---

## Project Structure

`
app/
├── packages/shared/              # Zod schemas, TS types, constants
├── apps/
│   ├── api/                      # Go backend (Gin + GORM)
│   │   ├── cmd/server/main.go
│   │   └── internal/             # config, database, models, handlers, services, middleware, routes
│   └── web/                      # React app (Vite + TanStack Router)
├── .env
├── docker-compose.yml
└── turbo.json                    # Turborepo configuration
`

**Mounted dashboards** (auto-configured in routes.go):
- `/docs` — API documentation (gin-docs, OpenAPI 3.1)
- `/studio` — Database browser (GORM Studio)
- `/sentinel/ui` — Security dashboard (WAF, rate limiting)
- `/pulse` — Observability (tracing, metrics)

---

## Generating Resources

`ash
grit generate resource Post --fields "title:string,content:text,published:bool,views:int"
`

Creates model, service, handler, schema, types, hooks, and injects into existing files via marker comments.

### Field Types

| Type | Go | TypeScript | Form |
|------|----|-----------|------|
| `string` | `string` | `string` | Text input |
| `text` | `string` | `string` | Textarea |
| `int` / `uint` / `float` | `int` / `uint` / `float64` | `number` | Number input |
| `bool` | `bool` | `boolean` | Toggle |
| `datetime` / `date` | `*time.Time` | `string | null` | Picker |
| `richtext` | `string` | `string` | Tiptap editor |
| `slug` | `string` | `string` | Auto-generated |
| `string_array` | `JSONSlice[string]` | `string[]` | Tag input |
| `belongs_to:X` | `uint` (FK) | `number` | Relationship select |
| `many_to_many:X` | Junction table | `number[]` | Multi-select |

**Modifiers:** `:unique`, `:required`, `:optional` (append after type).

---

## Marker Comments

Grit uses marker comments to inject generated code. **Never delete these:**

`go
// grit:models          — models/user.go (AutoMigrate list)
// grit:handlers        — routes/routes.go (handler initialization)
// grit:routes:protected — routes/routes.go (protected route group)
// grit:routes:admin    — routes/routes.go (admin route group)
`

`typescript
// grit:schemas         — schemas/index.ts
// grit:types           — types/index.ts
// grit:api-routes      — constants/index.ts
`
---

## Frontend Routing

Routes live in src/routes/. File naming: index.tsx (list), new.tsx (create), $id.tsx (detail), $id.edit.tsx (edit).
Use Route.useParams() for type-safe params. Uses createHashHistory() for Wails desktop compatibility.
Navigation: import { Link, useNavigate } from '@tanstack/react-router'.

---

## Common Tasks

### Add a field to an existing resource

1. Add field to Go model (apps/api/internal/models/<name>.go)
2. Update handler if field needs special handling
3. Update Zod schema (packages/shared/schemas/<name>.ts)
4. Update TypeScript type (packages/shared/types/<name>.ts)
5. Update admin resource (apps/admin/resources/<name>.ts) — add column + form field
6. Restart API (GORM auto-migrates)

### Add a new API endpoint

1. Create/update handler in the handlers directory
2. Register route in routes.go
3. Create React Query hook if frontend needs it

### Add a relationship

`go
type Post struct {
    CategoryID uint     // json:"category_id"
    Category   Category // gorm:"foreignKey:CategoryID" json:"category,omitempty"
}
// In handler: query.Preload("Category").Find(&posts)
`

---

## Critical Rules

1. **Never delete marker comments** (`// grit:*`)
2. **Follow the response format** — `{ data, message }` / `{ data, meta }` / `{ error: { code, message } }`
3. **Always handle errors in Go** — never ignore with `_`
4. **Keep the folder structure** — don't move files
5. **Use React Query** for all data fetching — no raw fetch
6. **Use Zod** for validation — shared between frontend and backend
7. **Use Tailwind + shadcn/ui** — no custom CSS files
8. **Use TanStack Router** — file-based routes in src/routes/
9. **Report bugs** — if you encounter a bug, open an issue at https://github.com/MUKE-coder/grit/issues with the error message and steps to reproduce
