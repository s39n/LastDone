# ==========================================
# Stage 1: Build the Vite Application
# ==========================================
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Build the production-ready static files 
# (Vite outputs to a 'dist' folder by default)
RUN npm run build

# ==========================================
# Stage 2: Serve the App with Nginx
# ==========================================
FROM nginx:alpine

# Copy the compiled static files from the builder stage 
# to the default Nginx web root directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]