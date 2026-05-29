# PaySys

This repository contains the PaySys workspace for the secure wallet foundation. It is organized as a single monorepo with a mobile app, backend services, shared contracts, infrastructure scaffolding, and the scripts used to validate each phase.

## Repository Layout

- `PaySys/mobile/` React Native mobile app
- `PaySys/backend/` Spring Boot backend and service modules
- `PaySys/shared/` shared TypeScript contracts and types
- `PaySys/scripts/` setup, verification, and environment helpers
- `PaySys/docs/` architecture notes, phase reports, and standards
- `PaySys/docker/` container build files
- `PaySys/infra/` infrastructure placeholders and environment-specific assets

## Prerequisites

- Node.js 18 or newer
- npm
- Java 17 for backend and Android builds
- Docker Desktop if you want to run the compose stack locally
- Android Studio and/or Xcode for mobile development

## Getting Started

```bash
npm install
npm run verify
docker compose up -d
npm run dev
```

If you work directly inside the workspace folder, copy the example environment files before running any app or service commands:

- `PaySys/.env.example` to `PaySys/.env`
- `PaySys/backend/.env.example` to `PaySys/backend/.env` if you need backend-specific overrides

Never commit real secrets, local keystores, or generated build output.

## Useful Commands

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run verify:phase1`
- `npm run verify:phase2`
- `npm run setup`

## Before Pushing

- Run `npm run verify` from the repository root.
- Confirm no local `.env` files or build artifacts are staged.
- Keep the GitHub Actions workflows under `.github/workflows/` in sync with any script changes.

The repository already includes CI checks for install, lint, build, and the phase verification flows, so the default push path should stay clean as long as the workspace and environment files remain local.
