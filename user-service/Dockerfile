# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Copy only the necessary files from the builder
COPY --from=builder /app ./

# Expose the service port
EXPOSE 3001

# Start the service
CMD ["node", "server.js"]
