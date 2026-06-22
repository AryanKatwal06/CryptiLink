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

// Determine repository root (parent directory of the .git file/dir).
const repoRoot = path.dirname(gitPath);

console.log(`Found .git at ${gitPath} — installing husky hooks in ${repoRoot}`);
// Run husky install from the repository root so husky can locate the git directory
// even if .git is a file (worktree/gitfile) or the install is triggered from a workspace subfolder.
const res = spawnSync('npx', ['husky', 'install', path.join(repoRoot, '.husky')], {
  stdio: 'inherit',
  cwd: repoRoot,
});
process.exit(res.status);
