const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const config = {
  host: '72.61.117.97',
  username: 'root',
  privateKey: path.join(require('os').homedir(), '.ssh', 'id_ed25519'),
  remoteRoot: '/var/www/saloon-crm/production',
};

function runRemote(command) {
  const sshCmd = `ssh -i "${config.privateKey}" ${config.username}@${config.host} "${command.replace(/"/g, '\\"')}"`;
  console.log(`📡 Executing: ${command}`);
  return execSync(sshCmd, { stdio: 'inherit' });
}

function upload(localPath, remotePath) {
  const scpCmd = `scp -i "${config.privateKey}" -r "${localPath}" ${config.username}@${config.host}:"${remotePath}"`;
  console.log(`⬆️  Uploading: ${localPath} to ${remotePath}`);
  return execSync(scpCmd, { stdio: 'inherit' });
}

async function deploy() {
  try {
    console.log('🚀 SALOON CRM PRODUCTION DEPLOYMENT STARTING...');
    
    // Create directories if not exist
    runRemote(`mkdir -p ${config.remoteRoot}/backend ${config.remoteRoot}/frontend/dist`);

    console.log('⬆️  Uploading Backend...');
    try {
      // Use quotes for paths in rsync
      const rsyncCmd = `rsync -avz -e "ssh -i '${config.privateKey}'" --exclude 'node_modules' --exclude '.git' --exclude 'uploads' --exclude '.DS_Store' "${path.join(__dirname, '/')}" ${config.username}@${config.host}:"${config.remoteRoot}/backend/"`;
      console.log('🔄 Syncing backend with rsync...');
      execSync(rsyncCmd, { stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️ rsync failed or not found, falling back to scp (slower)...');
      const items = fs.readdirSync(__dirname).filter(item => !['node_modules', '.git', 'uploads', '.DS_Store'].includes(item));
      for (const item of items) {
        upload(path.join(__dirname, item), `${config.remoteRoot}/backend/`);
      }
    }

    console.log('⬆️  Uploading Frontend Dist...');
    const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
    if (fs.existsSync(frontendDist)) {
      const rsyncFrontend = `rsync -avz -e "ssh -i '${config.privateKey}'" "${frontendDist}/" ${config.username}@${config.host}:"${config.remoteRoot}/frontend/dist/"`;
      try {
        execSync(rsyncFrontend, { stdio: 'inherit' });
      } catch (e) {
        upload(`${frontendDist}/`, `${config.remoteRoot}/frontend/dist/`);
      }
    }

    console.log('🔄 Installing production dependencies and restarting PM2...');
    runRemote(`cd ${config.remoteRoot}/backend && npm install --production --legacy-peer-deps`);
    
    // Setup PM2
    runRemote(`pm2 delete saloon-crm || true`);
    runRemote(`cd ${config.remoteRoot}/backend && pm2 start server.js --name "saloon-crm" --env production`);
    runRemote(`pm2 save`);

    console.log('✨ DEPLOYMENT FINISHED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DEPLOYMENT FAILED:', err.message);
    process.exit(1);
  }
}

deploy();
