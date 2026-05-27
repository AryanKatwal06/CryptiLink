const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const cwd = process.cwd();
const candidateRoots = [cwd, path.resolve(cwd, '..')];
const gitPath = candidateRoots
  .map((dir) => path.join(dir, '.git'))
  .find((candidate) => fs.existsSync(candidate));

if (!gitPath) {
  console.log('.git not found — skipping husky install');
  process.exit(0);
}

console.log('Found .git — installing husky hooks');
const res = spawnSync('npx', ['husky', 'install', '.husky'], { stdio: 'inherit' });
process.exit(res.status);
