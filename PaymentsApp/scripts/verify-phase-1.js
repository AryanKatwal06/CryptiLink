const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  'mobile',
  'backend',
  'shared',
  'infra',
  'tests',
  'scripts',
  'docs',
];

let pass = true;
const missing = [];
required.forEach((d) => {
  if (!fs.existsSync(path.join(root, d))) {
    pass = false;
    missing.push(d);
  }
});

const readmeMissing = [];
['mobile', 'mobile/app', 'shared/contracts', 'shared/types', 'docs'].forEach((d) => {
  const p = path.join(root, d, 'README.md');
  if (!fs.existsSync(p)) {
    readmeMissing.push(p);
  }
});

// Check tsconfig.base.json exists and tsconfig references
const tsBase = path.join(root, 'tsconfig.base.json');
const tsConfig = path.join(root, 'tsconfig.json');
let tsIssues = [];
if (!fs.existsSync(tsBase)) tsIssues.push('missing tsconfig.base.json');
if (fs.existsSync(tsConfig)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(tsConfig, 'utf8'));
    const refs = cfg.references || [];
    const refPaths = refs.map((r) => r.path);
    ['shared', 'mobile'].forEach((p) => {
      if (!refPaths.includes(`./${p}`) && !refPaths.includes(p)) tsIssues.push(`tsconfig missing reference to ${p}`);
    });
  } catch {
    tsIssues.push('tsconfig.json parse error');
  }
} else {
  tsIssues.push('missing tsconfig.json');
}


const report = {
  pass,
  missing,
  readmeMissing,
  tsIssues,
  warnings: [],
};

const outDir = path.join(root, 'docs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'phase-1-report.md');
fs.writeFileSync(out, '```json\n' + JSON.stringify(report, null, 2) + '\n```');

console.log(pass ? 'PASS' : 'FAIL');
process.exit(pass ? 0 : 2);
