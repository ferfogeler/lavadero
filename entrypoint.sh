#!/bin/sh
set -e

echo "→ Corriendo migraciones..."
./node_modules/.bin/prisma migrate deploy

echo "→ Iniciando servidor..."
exec node server.js
