# PortEx (Stateless Version)

PortEx is a modern E-Document management portal built for high performance and easy deployment.

## Tech Stack
- **Backend**: Go (Gin, GORM)
- **Frontend**: React (Vite, TailwindCSS)
- **Database**: External SQL Database (Supabase)
- **Storage**: S3-Compatible Storage

## Deployment on SnapDeploy.dev

### Environment Variables
- `PORT`: 8080
- `DB_CONNECTION_STRING`: Your external database URI
- `JWT_SECRET`: Your secure secret key
- `STORAGE_DRIVER`: s3 (or local)

### Backend Configuration
- **Branch**: `no-redis`
- **Root Directory**: `app/apps/api`
- **Port**: 8080

### Frontend Configuration
- **Branch**: `frontend`
- **Root Directory**: `app/apps/web`
- **Port**: 80
