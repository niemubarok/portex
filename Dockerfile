# Build stage
FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy the entire monorepo
COPY . .

# Set working directory to the API app
WORKDIR /app/app/apps/api

# Download dependencies
RUN go mod download

# Build binary
# We use the path relative to the current WORKDIR
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# Run stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/server .

# Expose the port (Leapcell usually uses 8080)
EXPOSE 8080

# Run the server
CMD ["./server"]
