# Stage 1: Build the React client
FROM node:14 AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Stage 2: Build the Node.js server
FROM node:14 AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ .

# Stage 3: Combine the client and server into a single image
FROM node:14
WORKDIR /app

# Copy the built client files
COPY --from=client-builder /app/client/build ./client/build

# Copy the server files
COPY --from=server-builder /app/server ./server

# Install server dependencies
WORKDIR /app/server
RUN npm install --production

# Expose the server port
EXPOSE 3000

# Start the server
CMD ["node", "app.js"]