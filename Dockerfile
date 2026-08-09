FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy dependency manifests and install
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# The EXPOSE instruction is technically documentation since your 
# compose file uses network_mode: host, but it's good practice.
EXPOSE 4000

# Start the application. 
# NOTE: Change "index.js" if your main entry file is named something else 
# (e.g., "server.js" or "app.js"), or use CMD ["npm", "start"] if defined.
CMD ["node", "index.js"]