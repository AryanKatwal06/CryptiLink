require('dotenv/config');

function ensure(value: string | undefined, label: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`[PaySys] Missing required environment variable: ${label}`);
  }
  return value;
}

async function main(): Promise<void> {
  const primary = process.env.DATABASE_URL ?? process.env.DATABASE_URL_DEV;
  const direct = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL_DEV_UNPOOLED;
  const staging = process.env.DATABASE_URL_STAGING;
  const shadow = process.env.DATABASE_SHADOW_URL ?? process.env.DATABASE_URL_DEV_UNPOOLED;

  ensure(primary, 'DATABASE_URL or DATABASE_URL_DEV');
  ensure(direct, 'DATABASE_URL_UNPOOLED or DATABASE_URL_DEV_UNPOOLED');
  ensure(staging, 'DATABASE_URL_STAGING');
  ensure(shadow, 'DATABASE_SHADOW_URL or DATABASE_URL_DEV_UNPOOLED');

  if (
    !primary!.includes('sslmode=require') ||
    !direct!.includes('sslmode=require') ||
    !staging!.includes('sslmode=require') ||
    !shadow!.includes('sslmode=require')
  ) {
    throw new Error('[PaySys] Neon connection strings must include sslmode=require');
  }

  console.log('  ✅ Neon PostgreSQL: CONFIGURED');
  console.log('     Pooled, direct, staging, and shadow strings present');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  console.error('  ❌ Neon PostgreSQL: FAILED');
  process.exit(1);
});