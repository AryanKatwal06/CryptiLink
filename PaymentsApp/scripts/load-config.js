const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const example = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
const required = example
  .split('\n')
  .map((l) => l.split('=')[0])
  .filter(Boolean);

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn('Missing env vars (placeholders allowed in repo):', missing.join(', '));
  process.exitCode = 1;
} else {
  console.log('All env placeholders present as keys.');
}

module.exports = { missing };
