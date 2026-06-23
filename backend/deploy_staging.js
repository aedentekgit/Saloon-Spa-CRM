const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const config = {
  host: process.env.DEPLOY_HOST,
  username: process.env.DEPLOY_USER || 'root',
  password: process.env.DEPLOY_PASSWORD,
  remoteRoot: process.env.DEPLOY_REMOTE_ROOT || '/staginger/apps/staging_saloon_spa_crm',
  pm2Name: process.env.DEPLOY_PM2_NAME || 'saloon-spa-crm-staging-api',
};

function assertDeployConfig() {
  const missing = ['DEPLOY_HOST', 'DEPLOY_PASSWORD'].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing deployment environment variable(s): ${missing.join(', ')}`);
  }
}

function quote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runRemote(command) {
  const sshCmd = `sshpass -p ${quote(config.password)} ssh -o StrictHostKeyChecking=no ${config.username}@${config.host} ${quote(command)}`;
  console.log(`Executing remote command: ${command}`);
  return execSync(sshCmd, { stdio: 'inherit' });
}

function upload(localPath, remotePath) {
  const scpCmd = `sshpass -p ${quote(config.password)} scp -o StrictHostKeyChecking=no -r ${quote(localPath)} ${config.username}@${config.host}:${quote(remotePath)}`;
  console.log(`Uploading: ${localPath} to ${remotePath}`);
  return execSync(scpCmd, { stdio: 'inherit' });
}

async function deploy() {
  try {
    assertDeployConfig();
    console.log('SALOON CRM STAGING DEPLOYMENT STARTING...');
    
    console.log('📦 Building Frontend for Staging...');
    execSync('VITE_API_URL=/staging_saloon_spa_crm/api VITE_BASE_URL=/staging_saloon_spa_crm/ npm run build', {
      cwd: path.join(__dirname, '../frontend'),
      stdio: 'inherit'
    });

    // Create directories if not exist
    runRemote(`mkdir -p ${config.remoteRoot}/backend ${config.remoteRoot}/frontend/dist`);

    console.log('⬆️  Uploading Backend...');
    try {
      // Use rsync with sshpass
      const rsyncCmd = `sshpass -p ${quote(config.password)} rsync -avz -e "ssh -o StrictHostKeyChecking=no" --exclude 'node_modules' --exclude '.git' --exclude 'uploads' --exclude '.DS_Store' --exclude '.env' ${quote(path.join(__dirname, '/'))} ${config.username}@${config.host}:${quote(`${config.remoteRoot}/backend/`)}`;
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
      const rsyncFrontend = `sshpass -p ${quote(config.password)} rsync -avz -e "ssh -o StrictHostKeyChecking=no" ${quote(`${frontendDist}/`)} ${config.username}@${config.host}:${quote(`${config.remoteRoot}/frontend/dist/`)}`;
      try {
        execSync(rsyncFrontend, { stdio: 'inherit' });
      } catch (e) {
        upload(`${frontendDist}/`, `${config.remoteRoot}/frontend/dist/`);
      }
    } else {
      console.log('⚠️  Frontend dist folder not found. Skipping frontend upload.');
    }

    console.log('🔄 Installing production dependencies and restarting PM2...');
    runRemote(`cd ${config.remoteRoot}/backend && npm install --production && pm2 restart ${config.pm2Name} && pm2 save`);

    console.log('✨ STAGING DEPLOYMENT FINISHED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DEPLOYMENT FAILED:', err.message);
    process.exit(1);
  }
}

deploy();
