# PaySys Environment Reference

| Key | Service | Used In | Required | Format | Example |
| --- | --- | --- | --- | --- | --- |
| APP_ENV | App | mobile | yes | `development`, `staging`, or `production` | `development` |
| RAZORPAY_MODE | Razorpay | mobile, backend | yes | `test` or `live` | `test` |
| API_BASE_URL | Render | mobile, backend | yes | HTTPS URL or localhost URL | `http://localhost:3000` |
| RENDER_SERVICE_URL | Render | backend | no | HTTPS URL | `https://paysys-api.onrender.com` |
| PORT | Render | backend | no | TCP port number | `10000` |
| NODE_ENV | Render | backend | no | Node environment name | `development` |
| DATABASE_URL | Neon | backend | yes | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| DATABASE_URL_UNPOOLED | Neon | backend | yes | PostgreSQL direct connection string | `postgresql://user:pass@host/db?sslmode=require` |
| DATABASE_URL_DEV | Neon | backend | no | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| DATABASE_URL_DEV_UNPOOLED | Neon | backend | no | PostgreSQL direct connection string | `postgresql://user:pass@host/db?sslmode=require` |
| DATABASE_URL_STAGING | Neon | backend | no | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| DATABASE_SHADOW_URL | Neon | backend | no | PostgreSQL direct connection string | `postgresql://user:pass@host/db?sslmode=require` |
| UPSTASH_REDIS_REST_URL | Upstash | backend | yes | HTTPS Redis REST URL | `https://us1-something.upstash.io` |
| UPSTASH_REDIS_REST_TOKEN | Upstash | backend | yes | REST token string | `AXXXXXXXXXXXXXXXXXXXXX` |
| FIREBASE_PROJECT_ID | Firebase | mobile, backend | yes | Firebase project id | `paysys` |
| RAZORPAY_KEY_ID | Razorpay | mobile, backend | yes | Test key id starting with `rzp_test_` | `rzp_test_123456` |
| RAZORPAY_KEY_SECRET | Razorpay | backend | yes | Test secret string | `test_secret_example` |
| POSTHOG_API_KEY | PostHog | mobile, backend | yes | Project API key starting with `phc_` | `phc_123456789` |
| POSTHOG_HOST | PostHog | mobile, backend | yes | Host URL | `https://eu.posthog.com` |
| ANDROID_KEYSTORE_FILE | Android Build | mobile | yes | Keystore filename | `paysys-release.keystore` |
| ANDROID_KEY_ALIAS | Android Build | mobile | yes | Keystore alias | `paysys-key` |
| ANDROID_STORE_PASSWORD | Android Build | mobile | yes | Keystore password | `change-me` |
| ANDROID_KEY_PASSWORD | Android Build | mobile | yes | Keystore password | `change-me` |
