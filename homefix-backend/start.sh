#!/bin/sh

echo "🚀 Starting application..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate --schema=./prisma/schema.prisma || echo "⚠️  Prisma generate failed"

# Run migrations (com retry)
echo "📦 Running database migrations..."
RETRY_COUNT=0
MAX_RETRIES=3
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
    echo "✅ Migrations applied successfully"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "⚠️  Migration failed, retrying in 5 seconds... (Attempt $RETRY_COUNT/$MAX_RETRIES)"
      sleep 5
    else
      echo "⚠️  Migrations failed after $MAX_RETRIES attempts"
      echo "⚠️  If this persists, you may need to manually run migrations"
    fi
  fi
done

# Run seed (idempotent)
echo "🌱 Seeding database..."
node prisma/seed.js || {
  echo "⚠️  Seed failed, but continuing..."
  echo "⚠️  You can run 'node prisma/seed.js' manually if needed"
}

# Start the application
echo "✅ Starting server..."
echo "PORT environment variable: ${PORT:-not set}"
echo "Starting Node.js server on port: ${PORT:-3000}"

if [ -z "$PORT" ]; then
  echo "⚠️  WARNING: PORT environment variable is not set!"
  echo "⚠️  Railway should set this automatically. Using default port 3000."
fi

node src/server.js

