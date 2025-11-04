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
echo "PORT environment variable: ${PORT:-not set}"
echo "Starting Node.js server on port: ${PORT:-3000}"

if [ -z "$PORT" ]; then
  echo "⚠️  WARNING: PORT environment variable is not set!"
  echo "⚠️  Railway should set this automatically. Using default port 3000."
fi

node src/server.js

