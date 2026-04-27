#!/bin/sh
set -e

echo "→ Aplicando cambios de schema..."
prisma db push --accept-data-loss --skip-generate

echo "→ Iniciando servidor..."
exec node server.js
