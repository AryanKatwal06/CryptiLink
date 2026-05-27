require('dotenv/config');

function ensure(value: string | undefined, label: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`[PaySys] Missing required environment variable: ${label}`);
  }
  return value;
}

async function main(): Promise<void> {
  const keyId = ensure(process.env.RAZORPAY_KEY_ID, 'RAZORPAY_KEY_ID');
  ensure(process.env.RAZORPAY_KEY_SECRET, 'RAZORPAY_KEY_SECRET');
  const mode = process.env.RAZORPAY_MODE ?? 'test';

  if (mode !== 'test') {
    throw new Error('[PaySys] Razorpay mode must remain test in Phase 1');
  }
  if (!keyId.startsWith('rzp_test_')) {
    throw new Error('[PaySys] Razorpay key must start with rzp_test_');
  }

  console.log('  ✅ Razorpay Sandbox: CONFIGURED');
  console.log('     Test mode and rzp_test_ key confirmed');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  console.error('  ❌ Razorpay: FAILED');
  process.exit(1);
});