# PaymentsApp — Foundation Layer

This folder contains the Phase 0 foundation for the PaymentsApp monorepo. It includes workspace configuration, CI, Docker placeholders, and automation scripts.

See the top-level README.md for repository-wide instructions.

Phase 1 Status: Completed (May 24, 2026)

Summary of Phase 1 changes:
- Added workspace scaffolding (`mobile/`, `backend/`, `shared/`, `infra/`, `scripts/`, `docs/`).
- Created shared TypeScript contracts and barrel exports in `shared/`.
- Added `tsconfig.base.json` and per-package `tsconfig.json` files with strict options.
- Implemented `ESLint` and `dependency-cruiser` rules to enforce architecture boundaries.
- Added `mobile/theme/tokens.ts` design tokens foundation and documentation.
- Created `scripts/load-config.js` and `.env` templates for safe environment loading.
- Implemented `scripts/verify-phase-1.js` verification script and CI workflow under `.github/workflows/`.

Run verification locally:

```bash
cd PaymentsApp
npm install
npm run verify:phase1
```

