# PortEx E-Document Portal

A professional, high-performance E-Document management system built with Go and React.

## 🚀 Overview

PortEx is a modern portal designed for efficient document handling, approval workflows, and secure storage. It features a robust Go backend and a sleek, responsive React frontend.

## 🛠️ Tech Stack

### Backend
- **Language:** Go
- **Framework:** [Gin](https://github.com/gin-gonic/gin)
- **ORM:** [GORM](https://gorm.io/)
- **Database:** PostgreSQL (Supabase) / SQLite
- **Security:** JWT Auth, Role-Based Access Control (RBAC)

### Frontend
- **Framework:** React + [Vite](https://vitejs.dev/)
- **Routing:** [TanStack Router](https://tanstack.com/router)
- **Styling:** Tailwind CSS + Vanilla CSS (Rich Aesthetics)
- **State Management:** TanStack Query (React Query)
- **Icons:** Lucide React

### Infrastructure
- **Deployment:** Render.com (Frontend & Backend)
- **Database:** Supabase
- **Storage:** Supabase Storage / MinIO (S3 Compatible)

## 📁 Project Structure

```bash
portex/
├── app/                  # Main Monorepo (pnpm workspace)
│   ├── apps/
│   │   ├── api/          # Go Backend Service
│   │   └── web/          # React Frontend (Vite)
│   ├── packages/         # Shared libraries and configs
│   ├── docker-compose.yml
│   └── turbo.json
└── README.md             # Project Root Documentation
```

## ⚡ Quick Start

### 1. Backend Setup
```bash
cd app/apps/api
go mod download
go run cmd/server/main.go
```

### 2. Frontend Setup
```bash
cd app/apps/web
pnpm install
pnpm dev
```

### 3. Environment Configuration
Copy `.env.example` to `.env` in the `app` directory and fill in your credentials:
- `DATABASE_URL`: Your Supabase/Postgres connection string.
- `JWT_SECRET`: For authentication.
- `STORAGE_DRIVER`: `s3` for Supabase/MinIO or `local`.

## 🚢 Deployment

Detailed deployment instructions for Render.com and Supabase can be found in the [deployment guide](docs/deployment_guide.md).

---
*Built with ❤️ by PortEx Team*
