#!/bin/sh
set -eu

DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:${DATA_DIR}/chamber.db"
fi

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "SEED_ON_START=true — running prisma db seed..."
  npx prisma db seed
fi

echo "Starting Chamber on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec npx next start --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3000}"
