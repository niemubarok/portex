# app

Built with [Grit](https://gritframework.dev) — Go + React.

## Quick Start

```bash
# 1. Install Air for Go hot reloading
go install github.com/air-verse/air@latest

# 2. Start infrastructure (PostgreSQL, Redis, MinIO, Mailhog)
docker compose up -d

# 3. Install dependencies
pnpm install

# 4. Start all services
pnpm dev
```

## Project Structure

```
app/
├── apps/
│   ├── api/          # Go backend (Gin + GORM)
│   └── web/          # React frontend (Vite + TanStack Router)
├── packages/
│   └── shared/       # Shared types, schemas, constants
├── docker-compose.yml
└── turbo.json
```

## Services

| Service       | URL                          |
|---------------|------------------------------|
| API           | http://localhost:8080         |
| GORM Studio   | http://localhost:8080/studio  |
| Web App       | http://localhost:5173         |
| PostgreSQL    | localhost:5432               |
| Redis         | localhost:6379               |
| MinIO Console | http://localhost:9001         |
| Mailhog       | http://localhost:8025         |

## Development

```bash
# Run Go API with hot reload
cd apps/api && air

# Run React web app
cd apps/web && pnpm dev

# Run all services via Turborepo
pnpm dev
```

## Cloud Integration (No Docker)

If you can't run Docker, use cloud services instead:

- **[Supabase](https://supabase.com)** — Database & Storage (free tier)
- **[Upstash](https://upstash.com)** — Redis (free tier)
- **[Resend](https://resend.com)** — Email (free tier)

## Tech Stack

- **Backend:** Go + Gin + GORM
- **Frontend:** React + Vite + TanStack Router + TypeScript
- **Styling:** Tailwind CSS + Vanilla CSS
- **Database:** PostgreSQL (Supabase)
- **Cache:** Redis
- **Monorepo:** Turborepo + pnpm
- **Data Fetching:** TanStack Query (React Query)

---

*Built with Grit*
