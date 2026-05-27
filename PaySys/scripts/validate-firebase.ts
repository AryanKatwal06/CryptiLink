import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensure(value: string | undefined, label: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`[PaySys] Missing required environment variable: ${label}`);
  }
  return value;
}

async function main(): Promise<void> {
  ensure(process.env.FIREBASE_PROJECT_ID, 'FIREBASE_PROJECT_ID');

  const googleServices = path.resolve(__dirname, '..', 'mobile/android/app/google-services.json');
  if (!fs.existsSync(googleServices)) {
    throw new Error('[PaySys] Missing android/app/google-services.json');
  }

  console.log('  ✅ Firebase Admin: CONFIGURED');
  console.log('     Project id and google-services.json are present');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  console.error('  ❌ Firebase: FAILED');
  process.exit(1);
});