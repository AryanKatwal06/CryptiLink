const { execSync } = require('child_process');

interface Result {
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
}

async function run(name: string, script: string): Promise<Result> {
  try {
    execSync(`node -r ts-node/register/transpile-only ${script}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { name, status: 'PASS' };
  } catch (err: unknown) {
    const failure = err as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    const details = failure.stderr?.toString().trim() || failure.stdout?.toString().trim() || failure.message || 'Unknown failure';
    return {
      name,
      status: 'FAIL',
      error: details,
    };
  }
}

async function main(): Promise<void> {
  console.log('');
  console.log('╔════════════════════════════════════╗');
  console.log('║  PAYSYS — SERVICE VALIDATION       ║');
  console.log('║  Phase 1 Infrastructure Health     ║');
  console.log('╚════════════════════════════════════╝');
  console.log('');

  const services = [
    { name: 'Neon PostgreSQL', script: 'scripts/validate-db.ts' },
    { name: 'Upstash Redis', script: 'scripts/validate-redis.ts' },
    { name: 'Firebase Admin', script: 'scripts/validate-firebase.ts' },
    { name: 'Razorpay Sandbox', script: 'scripts/validate-razorpay.ts' },
    { name: 'Local Diagnostics', script: 'scripts/validate-diagnostics.ts' },
    { name: 'PostHog', script: 'scripts/validate-posthog.ts' },
  ];

  const results: Result[] = [];

  for (const service of services) {
    process.stdout.write(`  ${service.name.padEnd(22)} → `);
    const result = await run(service.name, service.script);
    results.push(result);
    console.log(result.status === 'PASS' ? '✅ PASS' : '❌ FAIL');
  }

  const passed = results.filter((result) => result.status === 'PASS').length;
  const failed = results.length - passed;

  console.log('');
  console.log('────────────────────────────────────');
  console.log(`  ${passed}/${results.length} services passing`);

  if (failed > 0) {
    console.log('');
    console.log('  FAILURES:');
    results
      .filter((result) => result.status === 'FAIL')
      .forEach((result) => {
        console.log(`  ❌ ${result.name}`);
        if (result.error) {
          console.log(`     ${result.error.split('\n')[0]}`);
        }
      });
    console.log('');
    console.log('  ⚠️  Resolve all failures.');
    console.log('     Phase 1 is NOT complete.');
    process.exit(1);
  }

  console.log('');
  console.log('  ✅ ALL SERVICES OPERATIONAL');
  console.log('  ✅ Phase 1: COMPLETE');
  console.log('     Ready for Phase 2.');
  console.log('');
  process.exit(0);
}

main();