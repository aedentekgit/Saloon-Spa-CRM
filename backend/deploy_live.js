const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const config = {
  host: '194.238.23.158',
  username: 'root',
  password: 'Aedentek@123#',
  remoteRoot: '/staginger/apps/live_saloon_spa_crm',
};

function runRemote(command) {
  // Using sshpass for password-based SSH
  const sshCmd = `sshpass -p "${config.password}" ssh -o StrictHostKeyChecking=no ${config.username}@${config.host} "${command.replace(/"/g, '\\"')}"`;
  console.log(`📡 Executing: ${command}`);
  return execSync(sshCmd, { stdio: 'inherit' });
}

function upload(localPath, remotePath) {
  const scpCmd = `sshpass -p "${config.password}" scp -o StrictHostKeyChecking=no -r "${localPath}" ${config.username}@${config.host}:"${remotePath}"`;
  console.log(`⬆️  Uploading: ${localPath} to ${remotePath}`);
  return execSync(scpCmd, { stdio: 'inherit' });
}

async function deploy() {
  try {
    console.log('🚀 SALOON CRM LIVE DEPLOYMENT STARTING...');
    
    console.log('📦 Building Frontend for Live...');
    execSync('VITE_API_URL=/saloon_spa_crm/api npm run build', {
      cwd: path.join(__dirname, '../frontend'),
      stdio: 'inherit'
    });

    // Create directories if not exist
    runRemote(`mkdir -p ${config.remoteRoot}/backend ${config.remoteRoot}/frontend/dist`);

    console.log('⬆️  Uploading Backend...');
    try {
      // Use rsync with sshpass
      const rsyncCmd = `sshpass -p "${config.password}" rsync -avz -e "ssh -o StrictHostKeyChecking=no" --exclude 'node_modules' --exclude '.git' --exclude 'uploads' --exclude '.DS_Store' --exclude '.env' "${path.join(__dirname, '/')}" ${config.username}@${config.host}:"${config.remoteRoot}/backend/"`;
      console.log('🔄 Syncing backend with rsync (excluding .env)...');
      execSync(rsyncCmd, { stdio: 'inherit' });
    } catch (e) {
      console.log('⚠️ rsync failed, falling back to scp...');
      const items = fs.readdirSync(__dirname).filter(item => !['node_modules', '.git', 'uploads', '.DS_Store', '.env'].includes(item));
      for (const item of items) {
        upload(path.join(__dirname, item), `${config.remoteRoot}/backend/`);
      }
    }

    console.log('⬆️  Uploading Frontend Dist...');
    const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
    if (fs.existsSync(frontendDist)) {
      const rsyncFrontend = `sshpass -p "${config.password}" rsync -avz -e "ssh -o StrictHostKeyChecking=no" "${frontendDist}/" ${config.username}@${config.host}:"${config.remoteRoot}/frontend/dist/"`;
      try {
        execSync(rsyncFrontend, { stdio: 'inherit' });
      } catch (e) {
        upload(`${frontendDist}/`, `${config.remoteRoot}/frontend/dist/`);
      }
    }

    console.log('🔄 Installing production dependencies and restarting PM2...');
    runRemote(`cd ${config.remoteRoot}/backend && npm install --production && pm2 restart saloon-spa-crm-live-api && pm2 save`);

    console.log('✨ LIVE DEPLOYMENT FINISHED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DEPLOYMENT FAILED:', err.message);
    process.exit(1);
  }
}

deploy();
