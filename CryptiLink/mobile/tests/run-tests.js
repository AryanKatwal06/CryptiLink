/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const checks = [
  'app/index.tsx',
  'app/StartupCoordinator.tsx',
  'providers/AppProvider.tsx',
  'navigation/RootNavigator.tsx',
  'theme/registry.ts',
  'storage/adapter.ts',
  'state/stores.ts',
  'services/network.ts',
  'screens/SplashScreen.tsx',
];

let allOk = true;
console.log('Running mobile smoke checks...');
checks.forEach((rel) => {
  const p = path.join(root, rel);
  const ok = fs.existsSync(p);
  console.log(`${ok ? '[OK]' : '[MISSING]'} ${rel}`);
  if (!ok) allOk = false;
});

if (!allOk) {
  console.error('One or more checks failed');
  process.exit(2);
}

console.log('All mobile smoke checks passed');
process.exit(0);
