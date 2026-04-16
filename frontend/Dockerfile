# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN rm -f package-lock.json && npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the custom nginx config if you have one, or just the built assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port (default for nginx)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
