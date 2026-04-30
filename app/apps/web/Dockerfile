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

# Set Environment Variables for Build
ENV VITE_API_URL=https://portex-api.containers.snapdeploy.dev

# Build
RUN pnpm vite build

# Debug: List files to verify build success
RUN ls -la dist/

# Production stage
FROM nginx:alpine

# Copy nginx config first
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create directory and copy build artifacts
RUN mkdir -p /var/www/html
COPY --from=builder /app/dist /var/www/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
