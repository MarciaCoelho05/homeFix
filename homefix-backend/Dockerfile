# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy Prisma schema and migrations
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy application code
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Start application (migrations and seed will run at startup)
CMD ["./start.sh"]

