# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema and migrations first (needed for postinstall)
COPY prisma ./prisma/

# Install dependencies (this will run postinstall which needs prisma schema)
RUN npm ci

# Copy application code
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Start application (migrations and seed will run at startup)
CMD ["./start.sh"]

