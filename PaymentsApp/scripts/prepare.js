const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const cwd = process.cwd();
const gitPath = path.join(cwd, '.git');

if (!fs.existsSync(gitPath)) {
  console.log('.git not found — skipping husky install');
  process.exit(0);
}

console.log('Found .git — installing husky hooks');
const res = spawnSync('npx', ['husky', 'install', '.husky'], { stdio: 'inherit' });
process.exit(res.status);
