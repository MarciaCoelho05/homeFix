# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy application code
COPY . .

# Run migrations and seed
RUN npx prisma migrate deploy --schema=./prisma/schema.prisma || true
RUN node prisma/seed.js || true

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]

