#!/bin/sh

echo "🚀 Starting application..."

# Run migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma || echo "⚠️  Migrations failed or already applied"

# Run seed (idempotent)
echo "🌱 Seeding database..."
node prisma/seed.js || echo "⚠️  Seed failed or already completed"

# Start the application
echo "✅ Starting server..."
echo "PORT: ${PORT:-3000}"
echo "Starting Node.js server..."

node src/server.js

