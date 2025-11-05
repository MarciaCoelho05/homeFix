# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema and migrations first (needed for postinstall)
COPY prisma ./prisma/

# Temporarily disable postinstall to avoid Prisma generate during build
# We'll generate it manually after copying all files
RUN npm ci --ignore-scripts --legacy-peer-deps

# Generate Prisma Client manually
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy application code
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Start application (migrations and seed will run at startup)
CMD ["./start.sh"]

