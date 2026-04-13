const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const config = {
  host: '72.61.117.97',
  username: 'root',
  privateKey: path.join(require('os').homedir(), '.ssh', 'id_ed25519'),
  remoteRoot: '/var/www/saloon-crm/production',
};

async function deploy() {
  try {
    console.log('🚀 SALOON CRM PRODUCTION DEPLOYMENT STARTING...');
    
    await ssh.connect({
      host: config.host,
      username: config.config,
      privateKey: config.privateKey,
      readyTimeout: 30000,
    });

    console.log('✅ Connected to VPS');

    // Create directories if not exist
    await ssh.execCommand(`mkdir -p ${config.remoteRoot}/backend ${config.remoteRoot}/frontend/dist`);

    console.log('⬆️  Uploading Backend...');
    await ssh.putDirectory(path.join(__dirname), `${config.remoteRoot}/backend`, {
      recursive: true,
      concurrency: 10,
      validate: (itemPath) => {
        const base = path.basename(itemPath);
        return base !== 'node_modules' && base !== '.git' && base !== 'uploads' && base !== '.DS_Store';
      }
    });

    console.log('⬆️  Uploading Frontend Dist...');
    const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
    if (fs.existsSync(frontendDist)) {
      await ssh.putDirectory(frontendDist, `${config.remoteRoot}/frontend/dist`, {
        recursive: true,
        concurrency: 10
      });
    }

    console.log('🔄 Installing production dependencies and restarting PM2...');
    await ssh.execCommand(`cd ${config.remoteRoot}/backend && npm install --production`);
    
    // Setup PM2
    await ssh.execCommand(`pm2 delete saloon-crm || true`);
    await ssh.execCommand(`cd ${config.remoteRoot}/backend && pm2 start server.js --name "saloon-crm" --env production`);
    await ssh.execCommand(`pm2 save`);

    console.log('✨ DEPLOYMENT FINISHED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DEPLOYMENT FAILED:', err.message);
    process.exit(1);
  }
}

deploy();
