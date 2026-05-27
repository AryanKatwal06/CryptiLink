import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureFile(relativePath: string, label: string): void {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`[PaySys] Missing required diagnostics file: ${label}`);
  }
}

async function main(): Promise<void> {
  ensureFile('mobile/src/lib/diagnostics.ts', 'mobile/src/lib/diagnostics.ts');
  ensureFile('backend/src/main/java/com/payments/backend/observability/DiagnosticsAdapter.java', 'backend diagnostics adapter');
  ensureFile('mobile/providers/ErrorBoundary.tsx', 'mobile/providers/ErrorBoundary.tsx');

  console.log('  ✅ Local Diagnostics: CONFIGURED');
  console.log('     Error boundary and local logging stubs present');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  console.error('  ❌ Local Diagnostics: FAILED');
  process.exit(1);
});