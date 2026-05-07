#!/bin/bash
export SSHPASS="Aedentek@123#"
VPS="root@194.238.23.158"
DEST_BASE="/staginger/apps/live_saloon_spa_crm"

echo "Deploying backend to live..."
/opt/homebrew/bin/sshpass -e rsync -avz --exclude 'node_modules' --exclude '.env' --exclude '.git' ./backend/ $VPS:$DEST_BASE/backend/

echo "Deploying frontend to live..."
/opt/homebrew/bin/sshpass -e rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'dist' --exclude '.git' ./frontend/ $VPS:$DEST_BASE/frontend/

echo "Installing backend dependencies and restarting PM2 for live..."
/opt/homebrew/bin/sshpass -e ssh -o StrictHostKeyChecking=no $VPS "cd $DEST_BASE/backend && npm install && pm2 restart saloon-spa-crm-live-api"

echo "Building frontend for live..."
/opt/homebrew/bin/sshpass -e ssh -o StrictHostKeyChecking=no $VPS "cd $DEST_BASE/frontend && npm install && npm run build"

echo "Deployment to live complete."
