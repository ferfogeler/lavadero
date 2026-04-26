#!/bin/sh
set -e

echo "→ Corriendo migraciones..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "→ Iniciando servidor..."
exec node server.js
