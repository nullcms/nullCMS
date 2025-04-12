#!/bin/bash
set -e

docker compose up -d 

echo "✅ Starting App in background..."
npm run dev &  # Run in background
DEV_PID=$!

echo "⏳ Waiting for app to be ready..."
until curl -s http://localhost:4000/health > /dev/null; do
  echo "🔄 Waiting for app..."
  sleep 1
done

echo "✅ App is ready, running tests..."
npm run test:playright

echo "🧹 Cleaning up..."
docker compose down -v

# Optional: kill dev server if still running
kill $DEV_PID
