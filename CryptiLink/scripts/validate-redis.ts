import 'dotenv/config';

function ensure(value: string | undefined, label: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`[CryptiLink] Missing required environment variable: ${label}`);
  }
  return value;
}

async function main(): Promise<void> {
  const url = ensure(process.env.UPSTASH_REDIS_REST_URL, 'UPSTASH_REDIS_REST_URL');
  const token = ensure(process.env.UPSTASH_REDIS_REST_TOKEN, 'UPSTASH_REDIS_REST_TOKEN');

  if (!url.startsWith('https://')) {
    throw new Error('[CryptiLink] Upstash URL must use https://');
  }
  if (token.length < 10) {
    throw new Error('[CryptiLink] Upstash token looks invalid');
  }

  console.log('  ✅ Upstash Redis: CONFIGURED');
  console.log('     REST endpoint and token present');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  console.error('  ❌ Upstash Redis: FAILED');
  process.exit(1);
});