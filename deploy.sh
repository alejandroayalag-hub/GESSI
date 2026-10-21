#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="root@62.238.3.136"
SSH="ssh -i $HOME/.ssh/id_ed25519 -o IdentitiesOnly=yes"

echo "→ Construyendo frontend..."
cd "$ROOT_DIR/frontend"
node node_modules/vite/bin/vite.js build

echo "→ Sincronizando backend (sin tocar uploads)..."
rsync -az -e "$SSH" --delete --chown=apps:apps \
  --exclude='uploads/' \
  --exclude='node_modules/' \
  --exclude='.env' \
  "$ROOT_DIR/backend/" $SERVER:/home/apps/gessi/backend/

echo "→ Sincronizando frontend dist..."
rsync -az -e "$SSH" --delete --chown=apps:apps \
  "$ROOT_DIR/frontend/dist/" $SERVER:/home/apps/gessi/frontend/dist/

echo "→ Instalando dependencias y reiniciando..."
$SSH $SERVER "cd /home/apps/gessi/backend && sudo -u apps npm install --omit=dev --silent && sudo -u apps pm2 restart gessi-backend"

echo "→ Verificando..."
sleep 2
$SSH $SERVER "sudo -u apps pm2 show gessi-backend | grep -E 'status|restarts'"

echo "✓ Deploy completado"
