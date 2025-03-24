#!/bin/sh
# Wait for PostgreSQL to be ready
until psql "$DATABASE_URL" -c '\l' > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done
echo "PostgreSQL is ready!"
npm run migrate && npm start