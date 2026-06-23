const { loadEnv } = require('vite');
const env = loadEnv('production', '.', '');
console.log(env.VITE_BASE_URL);
