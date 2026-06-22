# CryptiLink - Integration Risk Register

# Phase 0 Output - All risks identified before development

## CRITICAL RISKS (Must resolve before Phase 1)

RISK-001
Severity: CRITICAL
Location: root package.json, CryptiLink/package.json, README.md
Description: Workspace declarations do not match the real folder layout. The root package.json points to `PaymentsApp`, while the CryptiLink workspace and README describe `apps/*` and `packages/*`, but the actual folders are `mobile/`, `backend/`, and `shared/`.
Impact: Workspace discovery and task orchestration can fail or silently skip packages.
Resolution: Normalize the workspace root and declared package globs to the actual directory layout, or rename the folders so the declarations are truthful.
Resolve In: Phase 1 - before any new package wiring.

RISK-002
Severity: CRITICAL
Location: CryptiLink/mobile/
Description: The mobile workspace has no package.json, so runtime dependencies for React Native, navigation, Zustand, Axios, and safe-area context are not declared anywhere in the workspace manifest.
Impact: The mobile app cannot be installed, type-checked, or executed as written.
Resolution: Create a real mobile package manifest and declare the runtime stack in Phase 1.
Resolve In: Phase 1 - before any mobile execution work.

RISK-003
Severity: CRITICAL
Location: mobile/navigation/RootNavigator.tsx, mobile/app/StartupCoordinator.tsx, mobile/providers/AppProvider.tsx
Description: The navigator imports `Dashboard`, and the startup/provider chain imports `ThemeProvider`, `QueryProvider`, `StorageProvider`, `NotificationProvider`, and `ErrorBoundary`, but those files are missing.
Impact: Application startup is broken by unresolved imports.
Resolution: Add the missing implementations or remove the references and replace them with working equivalents.
Resolve In: Phase 1 - before the mobile shell is treated as runnable.

RISK-004
Severity: CRITICAL
Location: mobile/
Description: Mobile app manifest and tooling files are missing: `app.json`, `eas.json`, `metro.config.js`, and `babel.config.js` were not found.
Impact: React Native startup, bundling, deep linking, and release configuration are incomplete.
Resolution: Add the missing manifests and tool configs during Phase 1.
Resolve In: Phase 1.

RISK-005
Severity: CRITICAL
Location: mobile/services/network.ts and CryptiLink/.env.example
Description: The API client defaults to an empty base URL, while the environment template exposes `API_URL` but the client is not wired to it.
Impact: Future API calls can drift between runtime configuration and code assumptions.
Resolution: Standardize one API base URL key and bind the client to it through a validated config layer.
Resolve In: Phase 1.

## HIGH RISKS (Must resolve before affected phase)

RISK-006
Severity: HIGH
Location: backend/src/main/java/com/payments/backend/security/SecurityConfig.java
Description: CORS allows all origins (`*`).
Impact: Production security posture is weakened and browser-based requests are over-permitted.
Resolution: Restrict allowed origins per environment and remove the wildcard default.
Resolve In: Before external-facing backend integration.

RISK-007
Severity: HIGH
Location: backend/src/main/java/com/payments/backend/health/HealthController.java and backend package tree
Description: Only health/readiness/liveness endpoints exist. Required CryptiLink endpoints for auth, wallet, payments, merchant, and user flows are absent.
Impact: Product features cannot be integrated against the backend.
Resolution: Add the missing domain controllers and wire the module packages to real services.
Resolve In: Phase 1 / early Phase 2 depending on scope sequencing.

RISK-008
Severity: HIGH
Location: backend/build.gradle, backend/src/main/resources (missing)
Description: No datasource, ORM, entity, repository, or migration configuration exists.
Impact: Wallet, transaction, merchant, and auth state cannot persist.
Resolution: Add a persistence stack and migrations before any stateful backend feature work.
Resolve In: Phase 1.

RISK-009
Severity: HIGH
Location: backend/analytics, auth, gateway, merchant, notifications, payments, users, wallet
Description: The domain folders exist only as README placeholders.
Impact: The backend module map is architectural only, not functional.
Resolution: Replace placeholder folders with concrete packages, handlers, and domain services.
Resolve In: Phase 1.

RISK-010
Severity: HIGH
Location: mobile/state/stores.ts
Description: Only two minimal stores exist, and none of the CryptiLink-required stores (auth, wallet, transaction, offline queue, merchant, UI, notifications) are present.
Impact: Application-wide state management is incomplete.
Resolution: Introduce the required stores with explicit persisted and ephemeral slices.
Resolve In: Phase 1 / Phase 2.

## MEDIUM RISKS (Monitor and resolve in-phase)

RISK-011
Severity: MEDIUM
Location: docs/CONFIG.md, CryptiLink/.env.example, scripts/load-config.js
Description: Environment key naming is inconsistent. The docs mention `API_BASE_URL`, the example file uses `API_URL`, and the network client is not wired to either.
Impact: Future integrations may diverge on configuration names.
Resolution: Pick one canonical key and align docs, config loader, and client bootstrap.
Resolve In: Phase 1.

RISK-012
Severity: MEDIUM
Location: mobile/theme/tokens.ts and mobile/theme/design-tokens.md
Description: The design system is dark-first with core tokens only; there is no shadow scale, no theme provider, and no font-loading implementation.
Impact: New UI work will need migration work instead of simple token reuse.
Resolution: Add theme provider, shadow tokens, and font loading before large UI expansion.
Resolve In: Phase 2.

RISK-013
Severity: MEDIUM
Location: backend/src/main/java/com/payments/backend/observability/\*
Description: Observability classes are placeholders only.
Impact: Metrics and error reporting are not operational yet.
Resolution: Replace stubs with real Micrometer/Sentry wiring when observability becomes a delivery requirement.
Resolve In: When operational telemetry is added.

RISK-014
Severity: MEDIUM
Location: CryptiLink/docker-compose.yml and docker/Dockerfile.\*
Description: Dockerfiles and compose services are placeholders that keep containers alive instead of running the actual app stacks.
Impact: Local container runs do not validate runtime behavior.
Resolution: Replace stub commands with real start commands after the app stacks are runnable.
Resolve In: Phase 2 or Phase 3.

## LOW RISKS (Track, resolve when convenient)

RISK-015
Severity: LOW
Location: repo README files and phase reports
Description: Several documentation files describe future-state features that are not yet implemented.
Impact: Documentation drift can confuse future implementation work.
Resolution: Keep phase reports updated and refresh stale README text as features land.
Resolve In: As docs are touched.

RISK-016
Severity: LOW
Location: package.json, CryptiLink/package.json
Description: TypeScript is pinned at 5.1.6 in both manifests. The version is valid, but the lockfile and dependency ecosystem should be revalidated before feature work begins.
Impact: Minor maintenance and compatibility review burden.
Resolution: Reassess compiler and tooling versions once the runtime stack is added.
Resolve In: During the first dependency refresh.

## SECURITY FLAGS

- SECURITY CRITICAL: no hardcoded real secrets were observed in the repository.
- SECURITY HIGH: `SecurityConfig.java` allows all CORS origins.
- SECURITY MEDIUM: local compose credentials for PostgreSQL use default development values (`postgres` / `postgres`) and should remain dev-only.
- SECURITY COMPLIANT: `.env.example` uses placeholders or empty values for `JWT_SECRET` and `POSTHOG_KEY`.

## COST RISK FLAGS

- No paid-tier service was explicitly configured in a way that can be confirmed from the repository.
- `POSTHOG_KEY` exists only as an empty placeholder, so no cost-bearing integration is active.

## CONFLICT RISK FLAGS

- Workspace declarations conflict with the actual folder layout.
- API key naming conflicts exist between `API_URL` and `API_BASE_URL` references.
- The navigator uses `Main` while the referenced screen file is missing.

## MISSING CRITICAL ITEMS

- `CryptiLink/mobile/package.json`
- `CryptiLink/mobile/app.json`
- `CryptiLink/mobile/eas.json`
- `CryptiLink/mobile/metro.config.js`
- `CryptiLink/mobile/babel.config.js`
- `CryptiLink/mobile/screens/Dashboard.tsx`
- `CryptiLink/mobile/providers/ThemeProvider.tsx`
- `CryptiLink/mobile/providers/QueryProvider.tsx`
- `CryptiLink/mobile/providers/StorageProvider.tsx`
- `CryptiLink/mobile/providers/NotificationProvider.tsx`
- `CryptiLink/mobile/providers/ErrorBoundary.tsx`
- backend datasource / ORM configuration
- backend migration system
- backend domain controllers and services for auth, wallet, payments, merchant, users, and notifications
