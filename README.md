# PaymentsApp — Foundation Layer

This repository has been reset and initialized for the PaymentsApp monorepo foundation.

Purpose: provide a production-ready engineering foundation (monorepo, tooling, CI, Docker, envs, scripts) so future phases can implement apps and services without refactoring.

Key goals:
- Monorepo orchestration with Turborepo
- Workspace layout for `apps/` and `packages/`
- Tooling: ESLint, Prettier, Husky, Commitlint, lint-staged
- Container skeletons and `docker-compose` with Postgres and Redis
- GitHub Actions CI pipeline (install / lint / build)
- One-command orchestration (`npm run dev`) stubbed for future wiring

Repository layout (top-level):

 - PaymentsApp/
   - apps/ (mobile, backend)
   - packages/ (ui, config, shared, types)
   - infra/ (local, production)
   - docker/ (Dockerfile.mobile, Dockerfile.backend)
   - scripts/ (setup, clean, verify, dev)
   - package.json (workspace root)
   - turbo.json
   - docker-compose.yml
   - .env.example / .env.local

Gotchas & rules:
- Secrets must never be committed. Use `.env` local files and infrastructure secrets management for production.
- Do not initialize app frameworks (React Native / Spring Boot) in this phase.

Quick start (developer machine):

```bash
# from repository root
npm install --prefix PaymentsApp
npm run --prefix PaymentsApp verify

# root-level compose now works from the repository root
docker compose up -d

# if you want the workspace package scripts directly
cd PaymentsApp
npm install
npm run verify

# prepare husky hooks locally
npm run prepare
```

CI / Automation:
- A GitHub Actions workflow `ci.yml` validates installs, lint and builds on push/PR.

CI / Automation:
- Wire `dev` orchestration to start `apps/mobile` and `apps/backend` concurrently
- Add React Native CLI skeleton to `apps/mobile` (not in this phase)
- Add Spring Boot skeleton to `apps/backend` (not in this phase)
- Configure infra (Terraform/Cloud) in `infra/production`

If anything should be changed about the foundation (preferred tools, CI policies, or hosting), reply with the exact preference and I will update the scaffold.

* Network-based mobile development
Phase 1 Completed (May 24, 2026)
- Purpose: implement the Phase 1 architecture foundation and developer guardrails for PaymentsApp.
- Deliverables included:
  - Workspace scaffolding under `PaymentsApp/` (mobile, backend, shared, infra, scripts, docs)
  - Shared TypeScript contracts and `shared/` barrel exports
  - Strict `tsconfig` setup, path aliases and per-package `tsconfig.json`
  - ESLint rules and dependency-cruiser configuration to enforce layer boundaries
  - Design tokens foundation for mobile (`mobile/theme/tokens.ts`)
  - Environment templates and `scripts/load-config.js` validator
  - `scripts/verify-phase-1.js` verification script and CI workflow to gate Phase 1
  - Husky pre-push hook to run the verifier locally
  - Documentation and READMEs for ownership and next steps

Next actions:
- Review the Phase 1 report at `PaymentsApp/docs/phase-1-report.md`.
- Push Phase 1 to your remote repository and create a release tag (the project has a `phase-1-complete` tag created by automation on request).

Phase 2 Completed (May 26, 2026)
- Purpose: build the complete mobile application runtime foundation (React Native CLI, startup, providers, navigation, storage, state, networking, theme, docs, and verification).
- Deliverables included:
  - Mobile runtime scaffold under `PaymentsApp/mobile/` with README and ownership files for each folder.
  - `StartupCoordinator` and provider composition (`AppProvider`, `QueryProvider`, `ThemeProvider`, `StorageProvider`, `NotificationProvider`, `ErrorBoundary`).
  - Navigation skeleton (`RootNavigator`) and typed screen shells (Splash, Onboarding, Login, OTP, Dashboard, Wallet, Pay, Activity, Profile).
  - State skeletons (`Zustand` stores), React Query setup, storage adapter interfaces, Axios client skeleton, offline queue/connectivity, animation presets, and observability placeholders.
  - Phase 2 verification scripts and GitHub Actions workflow: `.github/workflows/phase-2-ci.yml`.

Run Phase 2 checks locally:

```bash
cd PaymentsApp
npm install
# Run a quick smoke check that verifies mobile files
npm run test:mobile:smoke

# Run the Phase 2 verifier and generate a phase-2 report
npm run verify:phase2

# (Optional) Run dependency-cruiser to validate layered boundaries
npm run depcruise
```

Verification output is written to `PaymentsApp/mobile/docs/phase-2-report.md` and the CI workflow uploads the same file as an artifact for auditing.

