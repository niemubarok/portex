# Build stage
FROM node:20-alpine AS builder

# Set pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source
COPY . .

# Build
RUN pnpm build

# Production stage
FROM nginx:alpine

# Copy build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config if needed (default is fine for simple SPA)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
