# Use Node.js LTS version
FROM node:18-bullseye


# Install required system dependencies
RUN apt-get update && apt-get install -y \
    freetds-dev \
    unixodbc-dev \
    freetds-bin \
    tdsodbc \
    unixodbc \
    python3 \
    build-essential \
    iputils-ping \
    netcat \
    && rm -rf /var/lib/apt/lists/*

    # Add this before copying odbcinst.ini
RUN rm -f /etc/odbcinst.ini

COPY odbcinst.ini /etc/odbcinst.ini


# Create app directory
WORKDIR /usr/src/app


# Copy package files
COPY package*.json ./

# Clear npm cache and install dependencies
RUN npm cache clean --force && npm ci

# Copy app source
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]