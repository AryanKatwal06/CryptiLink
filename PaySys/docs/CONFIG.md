# Configuration & Environment Ownership

Purpose

- Describe environment variable responsibilities and ownership for PaySys Phase 1.

Environment files

- `.env.example`: template for all environments
- `.env.local`: local developer overrides (never commit secrets)
- `.env.development`, `.env.staging`, `.env.production`: placeholders for deployment

Ownership

- `APP_NAME`, `NODE_ENV`: owned by Platform Architects
- `API_BASE_URL`: owned by Backend team
- `POSTHOG_KEY`: owned by DevOps/Platform (secrets stored in infra secret manager)

Loading and validation

- Use the `scripts/verify-phase-1.js` and future `scripts/load-config.js` to validate presence of required keys.
- DO NOT store real secrets in the repository.
