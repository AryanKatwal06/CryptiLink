# CryptiLink Services Registry

## Neon PostgreSQL
Purpose: Primary relational database for users, wallets, transactions, merchants, audit logs, and sessions.
Provider URL: https://neon.tech
Plan: Free tier
Region: AWS ap-south-1 (Mumbai)
RN CLI Compat: Yes. Used through runtime env variables and backend/validation scripts, not Expo.

Free Tier Limits:
- Storage: 500 MB
- Compute hours: 191.9/month
- Branches: 10
- Projects: 1

Env Variables:
- DATABASE_URL: Pooled connection string for app queries
- DATABASE_URL_UNPOOLED: Direct connection string for migrations
- DATABASE_URL_DEV: Development pooled connection string
- DATABASE_URL_DEV_UNPOOLED: Development direct connection string
- DATABASE_URL_STAGING: Staging pooled connection string
- DATABASE_SHADOW_URL: Shadow database URL for migrations

Upgrade Trigger: Storage above 400 MB or compute above 150 hours/month.
Status: ❌ FAILED (waiting on founder-provided credentials)

## Upstash Redis
Purpose: Session caching, OTP rate limiting, API rate limiting, idempotency storage, and background queue support.
Provider URL: https://upstash.com
Plan: Free tier
Region: AWS ap-south-1 (Mumbai)
RN CLI Compat: Yes. Accessed via runtime env variables and Node validation scripts.

Free Tier Limits:
- Commands/day: 10,000
- Max data size: 256 MB
- Databases: 1
- Bandwidth: 200 MB/month

Env Variables:
- UPSTASH_REDIS_REST_URL: Redis REST endpoint
- UPSTASH_REDIS_REST_TOKEN: Redis REST token

Upgrade Trigger: Daily commands above 8,000 or data above 200 MB.
Status: ❌ FAILED (waiting on founder-provided credentials)

## Firebase
Purpose: Phone number OTP authentication for CryptiLink.
Provider URL: https://console.firebase.google.com
Plan: Spark plan
Region: Firebase project region selected by founder; phone auth should remain on test numbers during phase 1.
RN CLI Compat: Yes. Uses @react-native-firebase packages and native Android/iOS setup.

Free Tier Limits:
- Phone OTP: 10,000 verifications/month (India)

Env Variables:
- FIREBASE_PROJECT_ID: Firebase project identifier
- No backend admin SDK is required in Phase 1.

Upgrade Trigger: Phone verifications above 8,000/month.
Status: ❌ FAILED (waiting on founder-provided credentials and google-services.json)

## Razorpay
Purpose: Payment gateway for sandbox-only development flows.
Provider URL: https://dashboard.razorpay.com
Plan: Test mode only in this phase
Region: Sandbox/test environment; no live transactions permitted.
RN CLI Compat: Yes. Use the React Native CLI integration and sandbox keys only.

Free Tier Limits:
- Sandbox usage only
- No live transactions in phase 1

Env Variables:
- RAZORPAY_KEY_ID: Test API key starting with rzp_test_
- RAZORPAY_KEY_SECRET: Test API secret
- RAZORPAY_MODE: Must remain test during phase 1

Upgrade Trigger: Only after production launch, founder approval, and complete Razorpay KYC.
Status: ❌ FAILED (waiting on founder test-mode credentials)

## Render
Purpose: Backend hosting target for the CryptiLink API.
Provider URL: https://render.com
Plan: Free tier
Region: Oregon (US) during provisioning; deployment deferred until later phases.
RN CLI Compat: Yes. Used as the backend URL source for mobile runtime config.

Free Tier Limits:
- RAM: 512 MB
- Bandwidth: 100 GB/month
- Sleep after 15 minutes of inactivity
- Build minutes: 500/month

Env Variables:
- API_BASE_URL: Public backend base URL
- RENDER_SERVICE_URL: Render service URL
- PORT: Backend port for the service
- NODE_ENV: Runtime mode for backend hosting

Upgrade Trigger: Cold starts impacting users, RAM above 400 MB, or traffic above 80 GB/month.
Status: ⏸ DEFERRED (waiting for GitHub push before provisioning)

## Local Diagnostics
Purpose: Local crash visibility and error-boundary coverage without an external SaaS dependency.
Provider URL: none
Plan: Built-in
Region: Local app/runtime logs and backend stdout
RN CLI Compat: Yes. Uses local helpers and the existing app error boundary.

Free Tier Limits:
- None; this is local-only.

Env Variables:
- None.

Upgrade Trigger: If remote crash analytics becomes necessary in a later phase.
Status: ✅ CONFIGURED

## PostHog
Purpose: Product analytics, funnels, feature flags, and session replay.
Provider URL: https://posthog.com
Plan: Free tier
Region: EU or US instance selected by founder
RN CLI Compat: Yes. Use posthog-react-native and posthog-node without Expo dependencies.

Free Tier Limits:
- 1,000,000 events/month
- Unlimited feature flags

Env Variables:
- POSTHOG_API_KEY: PostHog project API key
- POSTHOG_HOST: PostHog instance host URL

Upgrade Trigger: Events above 800,000/month.
Status: ❌ FAILED (waiting on founder project setup)

## Android Build Environment
Purpose: Local Android builds, signing, and CI skeleton for release readiness.
Provider URL: https://developer.android.com/studio
Plan: Free local tooling
Region: Local workstation and GitHub Actions
RN CLI Compat: Yes. This is the native Android CLI path.

Free Tier Limits:
- Local Android Studio and Gradle usage only
- GitHub Actions free tier for skeleton CI

Env Variables:
- ANDROID_KEYSTORE_FILE: Release keystore filename
- ANDROID_KEY_ALIAS: Keystore alias
- ANDROID_STORE_PASSWORD: Keystore store password
- ANDROID_KEY_PASSWORD: Keystore key password

Upgrade Trigger: Release signing and distribution requirements in a later phase.
Status: ❌ FAILED (waiting on founder keystore and device verification)
