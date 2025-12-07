# Node.js Torrent Web App (Backend + Client)
FROM node:20-slim

# Install bun for client build
RUN npm install -g bun

WORKDIR /app

# Copy root package files for torrent-search-api dependency
COPY package*.json ./
COPY patches/ ./patches/

# Install root dependencies
RUN npm install

# Copy torrent-web package files
COPY torrent-web/package*.json ./torrent-web/

# Install torrent-web dependencies
WORKDIR /app/torrent-web
RUN npm install

# Copy client package files and install
COPY torrent-web/client/package*.json ./client/
WORKDIR /app/torrent-web/client
RUN bun install

# Copy all source files
WORKDIR /app
COPY src/ ./src/
COPY torrent-web/server/ ./torrent-web/server/
COPY torrent-web/client/ ./torrent-web/client/

# Build the client for production
WORKDIR /app/torrent-web/client
RUN bun run build

# Back to torrent-web for running the server
WORKDIR /app/torrent-web

# Expose port
EXPOSE 3000

# Install tsx globally for running TypeScript
RUN npm install -g tsx

# Run the backend server
CMD ["tsx", "server/index.ts"]
