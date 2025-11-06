FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY homefix-backend/package*.json ./

# Copy .npmrc if it exists (optional - using wildcard to handle missing file)
COPY homefix-backend/.npmrc* ./

# Copy Prisma schema for generation
COPY homefix-backend/prisma ./prisma/

# Install dependencies with fallback
RUN npm ci --ignore-scripts --legacy-peer-deps || npm install --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy the rest of the application
COPY homefix-backend/ .

# Make start script executable
RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]

