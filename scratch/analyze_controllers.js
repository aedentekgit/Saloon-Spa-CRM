const fs = require('fs');
const path = require('path');
const controllersDir = path.join(__dirname, '../backend/controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));

files.forEach(f => {
  const code = fs.readFileSync(path.join(controllersDir, f), 'utf8');
  const match = code.match(/exports\.get[A-Za-z]+ = async \([^)]+\) => \{[\s\S]*?res\.json\([^)]+\);/m) || code.match(/const get[A-Za-z]+ = async \([^)]+\) => \{[\s\S]*?res\.json\([^)]+\);/m);
  if (match) {
    console.log(`--- ${f} ---`);
    console.log(match[0].split('\n').filter(l => l.includes('.find') || l.includes('res.json')).join('\n'));
  }
});
