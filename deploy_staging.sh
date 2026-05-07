#!/bin/bash
export SSHPASS="Aedentek@123#"
VPS="root@194.238.23.158"
DEST_BASE="/staginger/apps/staging_saloon_spa_crm"

echo "Deploying backend..."
/opt/homebrew/bin/sshpass -e rsync -avz --exclude 'node_modules' --exclude '.env' --exclude '.git' ./backend/ $VPS:$DEST_BASE/backend/

echo "Deploying frontend..."
/opt/homebrew/bin/sshpass -e rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'dist' --exclude '.git' ./frontend/ $VPS:$DEST_BASE/frontend/

echo "Installing backend dependencies and restarting PM2..."
/opt/homebrew/bin/sshpass -e ssh -o StrictHostKeyChecking=no $VPS "cd $DEST_BASE/backend && npm install && pm2 restart saloon-spa-crm-staging-api"

echo "Building frontend..."
/opt/homebrew/bin/sshpass -e ssh -o StrictHostKeyChecking=no $VPS "cd $DEST_BASE/frontend && npm install && npm run build"

echo "Deployment complete."
