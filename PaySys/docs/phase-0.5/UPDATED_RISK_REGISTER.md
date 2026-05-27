# PaySys - Updated Risk Register

## CRITICAL RISKS

RISK-001
Status: RESOLVED
Severity: CRITICAL
Location: root package.json, PaySys/package.json, README.md
Description: Workspace declarations no longer match the actual folder layout.

RISK-002
Status: RESOLVED
Severity: CRITICAL
Location: PaySys/mobile/
Description: The mobile workspace now has a package.json and a defined runtime manifest.

RISK-003
Status: RESOLVED
Severity: CRITICAL
Location: mobile/navigation/RootNavigator.tsx, mobile/app/StartupCoordinator.tsx, mobile/providers/AppProvider.tsx
Description: The referenced dashboard and provider files now exist.

RISK-004
Status: RESOLVED
Severity: CRITICAL
Location: mobile/
Description: Mobile manifest and tooling files now exist.

RISK-005
Status: RESOLVED
Severity: CRITICAL
Location: mobile/services/network.ts and PaySys/.env.example
Description: The API client is wired to the standardized API base URL.

## HIGH RISKS

RISK-006
Status: RESOLVED
Severity: HIGH
Location: backend/src/main/java/com/payments/backend/security/SecurityConfig.java
Description: Wildcard CORS origins were removed and replaced with config-driven origins.

RISK-007
Status: RESOLVED
Severity: HIGH
Location: backend/src/main/java/com/payments/backend/health/HealthController.java and backend package tree
Description: Required backend API endpoints now exist as scaffold controllers.

RISK-008
Status: RESOLVED
Severity: HIGH
Location: backend/build.gradle, backend/src/main/resources
Description: Persistence and migration configuration now exists.

RISK-009
Status: RESOLVED
Severity: HIGH
Location: backend/analytics, auth, gateway, merchant, notifications, payments, users, wallet
Description: The domain folders now contain source files, not only README placeholders.

RISK-010
Status: RESOLVED
Severity: HIGH
Location: mobile/state/stores.ts
Description: The required PaySys state slices now exist.

## MEDIUM RISKS

RISK-011
Status: RESOLVED
Severity: MEDIUM
Location: docs/CONFIG.md, PaySys/.env.example, scripts/load-config.js
Description: Environment key naming is now standardized on `API_BASE_URL`.

RISK-012
Status: DEFERRED
Severity: MEDIUM
Location: mobile/theme/tokens.ts and mobile/theme/design-tokens.md
Description: Shadow scale and font-loading still need to be completed in a later UI phase.
Resolve In: Phase 2.

RISK-013
Status: DEFERRED
Severity: MEDIUM
Location: backend/src/main/java/com/payments/backend/observability/\*
Description: Observability classes remain placeholders.
Resolve In: Phase 12.

RISK-014
Status: DEFERRED
Severity: MEDIUM
Location: PaySys/docker-compose.yml and docker/Dockerfile.\*
Description: Docker runtime commands are still placeholder tails.
Resolve In: Phase 2 or Phase 3.

## LOW RISKS

RISK-015
Status: ACCEPTED
Severity: LOW
Location: repo README files and phase reports
Description: Documentation drift remains a monitoring item, but it does not block Phase 1.

RISK-016
Status: ACCEPTED
Severity: LOW
Location: package.json, PaySys/package.json
Description: TypeScript and tooling versions are valid for the current foundation; refresh later if needed.

## SECURITY FLAGS

- No hardcoded secrets were found in source files.
- CORS is now config-driven rather than wildcard-open.
- `.env.example` remains placeholder-only and safe for commit.
- Local development credentials in docker-compose remain dev-only.

## COST RISK FLAGS

- No paid-tier external services are configured in the repository.
- All active services in this phase are local or free-tier friendly.

## CONFLICT RISK FLAGS

- Workspace declarations are aligned.
- API base URL naming is aligned on `API_BASE_URL`.
- Navigator route references now resolve.

## MISSING CRITICAL ITEMS

- None remain for the foundation phase.
- Real feature implementations are still scheduled for later phases.
