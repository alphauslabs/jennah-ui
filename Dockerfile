# Stage 1: Build the React App
# We use Node to compile your TypeScript into static HTML/JS
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# START COMMAND
CMD ["nginx", "-g", "daemon off;"]