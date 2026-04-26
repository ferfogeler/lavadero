#!/bin/sh
set -e

echo "→ Corriendo migraciones..."
prisma migrate deploy

echo "→ Iniciando servidor..."
exec node server.js
