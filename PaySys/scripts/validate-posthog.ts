import 'dotenv/config';

function ensure(value: string | undefined, label: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`[PaySys] Missing required environment variable: ${label}`);
  }
  return value;
}

async function main(): Promise<void> {
  const apiKey = ensure(process.env.POSTHOG_API_KEY, 'POSTHOG_API_KEY');
  const host = ensure(process.env.POSTHOG_HOST, 'POSTHOG_HOST');

  if (!apiKey.startsWith('phc_')) {
    throw new Error('[PaySys] PostHog API key should start with phc_');
  }
  if (!host.startsWith('http')) {
    throw new Error('[PaySys] PostHog host must be an HTTP URL');
  }

  console.log('  ✅ PostHog: CONFIGURED');
  console.log('     API key and host are present');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  console.error('  ❌ PostHog: FAILED');
  process.exit(1);
});