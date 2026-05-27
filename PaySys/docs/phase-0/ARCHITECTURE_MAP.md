# PaySys - Architecture Map

# Generated: Phase 0 Repository Analysis

# Status: Read-only reference document

## 1. Repository Overview

The repository is a nested monorepo-style workspace. The top-level repository is a wrapper around the actual PaySys workspace in `PaySys/`.

- Top-level package manager: npm
- Lockfile format: package-lock.json lockfileVersion 3
- Workspace manager in the PaySys workspace: Turborepo (`turbo.json`)
- Declared workspace layout in `PaySys/package.json`: `apps/*`, `packages/*`
- Actual on-disk layout: `mobile/`, `backend/`, `shared/`, `infra/`, `scripts/`, `docs/`, `docker/`, `tests/`

Observed structural conflicts:

- Root package.json declares workspaces as `PaymentsApp`, which does not exist.
- `PaySys/package.json` and the repository README describe `apps/` and `packages/`, but the actual source folders are `mobile/`, `backend/`, and `shared/`.

## 2. Technology Stack (Confirmed)

| Package / Tool     |                                       Version | Category  |
| ------------------ | --------------------------------------------: | --------- |
| npm                |                    lockfileVersion 3 evidence | BUILD     |
| Turborepo          |                                       1.10.12 | BUILD     |
| TypeScript         |                                         5.1.6 | BUILD     |
| ESLint             |                                        8.57.1 | BUILD     |
| Prettier           |                                         2.8.8 | BUILD     |
| dependency-cruiser |                                        17.4.2 | BUILD     |
| Husky              |                                         8.0.0 | UTILITY   |
| lint-staged        |                                        13.2.3 | UTILITY   |
| dotenv             |                                        16.1.4 | UTILITY   |
| Spring Boot        |                                         3.2.2 | FRAMEWORK |
| Java               |                                            21 | FRAMEWORK |
| Gradle             | wrapper present; build.gradle targets Java 21 | BUILD     |
| PostgreSQL         |                         15 via docker-compose | STORAGE   |
| Redis              |                          7 via docker-compose | STORAGE   |
| Docker Compose     |                                       present | BUILD     |

No runtime mobile dependency manifest exists under `PaySys/mobile/`, so React Native / navigation / state / networking package versions are not directly confirmable from a package file.

## 3. Complete Folder Structure

### Top-level repository wrapper

- `.git/` - Git metadata and remote tracking
- `.github/` - GitHub Actions workflows
- `.gitignore` - ignore rules
- `.vscode/` - editor settings
- `commitlint.config.cjs` - commit message policy
- `docker-compose.yml` - top-level compose wrapper for PaySys
- `package-lock.json` - npm lockfile for the wrapper repo
- `package.json` - wrapper scripts; stale workspaces entry
- `README.md` - repository wrapper README
- `PaySys/` - actual product workspace

### PaySys workspace root

- `.dependency-cruiser.js` - architecture guardrails
- `.editorconfig` - editor formatting baseline
- `.env.example` - environment template
- `.eslintrc.json` - lint rules and import restrictions
- `.gitignore` - project-specific ignores
- `.husky/` - git hook setup
- `.prettierrc` - formatting rules
- `backend/` - Spring Boot backend scaffold
- `docker/` - Dockerfiles for backend and mobile placeholders
- `docker-compose.yml` - PaySys runtime compose file
- `docs/` - architecture and phase documentation
- `governance/` - definition of done and policy docs
- `infra/` - infrastructure placeholder
- `mobile/` - React Native mobile scaffold
- `scripts/` - workspace automation and verification scripts
- `shared/` - shared TypeScript contracts and constants
- `tests/` - cross-cutting test scaffolding
- `tsconfig.base.json` - shared TypeScript compiler baseline
- `tsconfig.json` - workspace project references
- `turbo.json` - Turborepo pipeline config

### mobile/

| File                           | Approx size | Responsibility                                 | Imports / dependencies                                                                                   | Export                                 |
| ------------------------------ | ----------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `app/index.tsx`                | small       | Native entrypoint; registers PaySys app        | react-native, `./StartupCoordinator`                                                                     | default export `App`                   |
| `app/StartupCoordinator.tsx`   | small       | Bootstraps startup and provider nesting        | React, react-native, navigation, provider modules                                                        | named and default `StartupCoordinator` |
| `navigation/RootNavigator.tsx` | small       | Root stack navigator                           | `@react-navigation/native`, `@react-navigation/stack`, `../screens/SplashScreen`, `../screens/Dashboard` | named and default `RootNavigator`      |
| `providers/AppProvider.tsx`    | small       | Root provider wrapper                          | react, `react-native-safe-area-context`, `./ErrorBoundary`                                               | named and default `AppProvider`        |
| `screens/SplashScreen.tsx`     | small       | Splash placeholder screen                      | react, react-native                                                                                      | default export only                    |
| `services/network.ts`          | small       | Axios client factory                           | axios                                                                                                    | named and default `createApiClient`    |
| `state/stores.ts`              | small       | Zustand session/preferences stores             | zustand                                                                                                  | named stores and default object export |
| `storage/adapter.ts`           | small       | Storage adapter interface and MMKV placeholder | none beyond types                                                                                        | named interfaces/functions             |
| `theme/tokens.ts`              | small       | Dark-first design tokens                       | none                                                                                                     | named constants and default bundle     |
| `theme/registry.ts`            | small       | Token access registry                          | `./tokens`                                                                                               | named and default `ThemeRegistry`      |
| `theme/design-tokens.md`       | small       | Design token guidance                          | documentation only                                                                                       | none                                   |
| `README.md`                    | small       | Mobile folder README                           | documentation only                                                                                       | none                                   |
| `app/README.md`                | small       | App entrypoint README                          | documentation only                                                                                       | none                                   |
| `docs/phase-2-report.md`       | small       | Phase 2 verification output                    | documentation only                                                                                       | none                                   |
| `tests/run-tests.js`           | small       | Smoke-test script                              | fs, path                                                                                                 | CommonJS module                        |

Observed mobile architecture gaps:

- `mobile/package.json` is missing.
- `app.json`, `eas.json`, `metro.config.js`, and `babel.config.js` are missing.
- `screens/Dashboard.tsx` is missing even though it is imported by `RootNavigator.tsx`.
- `providers/ThemeProvider.tsx`, `QueryProvider.tsx`, `StorageProvider.tsx`, `NotificationProvider.tsx`, and `ErrorBoundary.tsx` are missing even though `StartupCoordinator.tsx` and `AppProvider.tsx` import them.

### shared/

| File                       | Approx size | Responsibility                                 | Imports / dependencies                                | Export                 |
| -------------------------- | ----------- | ---------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| `index.ts`                 | small       | Barrel export for all shared modules           | `./contracts/*`, `./types/index`, `./constants/index` | re-export only         |
| `constants/index.ts`       | small       | Shared route, storage, and network constants   | none                                                  | named constants        |
| `contracts/transaction.ts` | small       | Transaction DTO and enum                       | none                                                  | named enum/interface   |
| `contracts/wallet.ts`      | small       | Wallet DTO and enum                            | none                                                  | named enum/interface   |
| `contracts/merchant.ts`    | small       | Merchant DTO and enum                          | none                                                  | named enum/interface   |
| `types/index.ts`           | small       | Common app types, envelopes, and base entities | none                                                  | named interfaces/types |
| `contracts/README.md`      | small       | Contracts folder policy                        | documentation only                                    | none                   |
| `types/README.md`          | small       | Types folder policy                            | documentation only                                    | none                   |

### backend/

| File                                                                           | Approx size     | Responsibility                                                                         | Imports / dependencies                         | Export                   |
| ------------------------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------ |
| `build.gradle`                                                                 | small           | Spring Boot build definition                                                           | Spring Boot starters, Micrometer, JUnit 5      | Gradle config            |
| `settings.gradle`                                                              | small           | Gradle project name                                                                    | none                                           | Gradle config            |
| `README.md`                                                                    | small           | Backend workspace README                                                               | documentation only                             | none                     |
| `tests/README.md`                                                              | small           | Backend tests documentation                                                            | documentation only                             | none                     |
| `src/main/java/com/payments/backend/BackendApplication.java`                   | small           | Spring Boot entrypoint                                                                 | SpringBootApplication, SpringApplication       | Java class               |
| `src/main/java/com/payments/backend/config/ConfigLoader.java`                  | small           | Loads environment files and system env                                                 | SLF4J, java.io, java.nio, Properties           | Spring component         |
| `src/main/java/com/payments/backend/health/HealthController.java`              | small           | Health, readiness, liveness endpoints                                                  | Spring Web, StartupCoordinator, ModuleRegistry | REST controller          |
| `src/main/java/com/payments/backend/startup/StartupCoordinator.java`           | small           | Module startup lifecycle                                                               | SLF4J, Spring events, ModuleRegistry           | Spring component         |
| `src/main/java/com/payments/backend/module/Module.java`                        | small           | Module contract and module state enum                                                  | none                                           | interface + package enum |
| `src/main/java/com/payments/backend/module/ModuleRegistry.java`                | small           | Discovers Module beans                                                                 | Spring ListableBeanFactory, collections        | Spring component         |
| `src/main/java/com/payments/backend/infrastructure/InfrastructureManager.java` | small           | Placeholder infrastructure module                                                      | not read directly; directory exists            | expected stub            |
| `src/main/java/com/payments/backend/observability/MetricsRegistry.java`        | small           | Metrics placeholder                                                                    | none                                           | class stub               |
| `src/main/java/com/payments/backend/observability/SentryAdapter.java`          | small           | Sentry placeholder                                                                     | none                                           | class stub               |
| `src/main/java/com/payments/backend/errors/ErrorResponse.java`                 | small           | Error payload model                                                                    | none                                           | public class             |
| `src/main/java/com/payments/backend/errors/GlobalExceptionHandler.java`        | small           | Global exception mapping                                                               | Spring MVC, logging, UUID                      | controller advice        |
| `src/main/java/com/payments/backend/security/SecurityConfig.java`              | small           | CORS configuration                                                                     | Spring CORS, CorsFilter                        | configuration bean       |
| `src/test/java/com/payments/backend/StartupTests.java`                         | small           | Spring context load test                                                               | SpringBootTest, JUnit 5                        | test class               |
| `analytics/README.md`                                                          | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `auth/README.md`                                                               | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `gateway/README.md`                                                            | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `merchant/README.md`                                                           | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `notifications/README.md`                                                      | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `payments/README.md`                                                           | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `users/README.md`                                                              | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `wallet/README.md`                                                             | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `config/README.md`                                                             | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `infrastructure/README.md`                                                     | small           | Domain placeholder                                                                     | documentation only                             | none                     |
| `shared/README.md`                                                             | small           | Shared backend folder placeholder                                                      | documentation only                             | none                     |
| `build/README.md`                                                              | small           | Build folder placeholder                                                               | documentation only                             | none                     |
| `docs/*.md`                                                                    | small to medium | Architecture, config, modules, observability, request flow, security, startup, reports | documentation only                             | none                     |
| `scripts/verify-phase-3.sh`                                                    | small           | Backend verification helper                                                            | shell                                          | shell script             |

Backend source tree summary:

Backend is a Spring Boot modular monolith skeleton with `health`, `startup`, `module`, `config`, `security`, `errors`, `observability`, and `infrastructure` packages. Domain folders exist only as README placeholders.

## 4. Navigation Architecture

Current tree from `mobile/navigation/RootNavigator.tsx`:

- NavigationContainer
  - Stack.Navigator initialRouteName: Splash
    - Stack.Screen name: Splash -> `mobile/screens/SplashScreen.tsx`
      - params: none
      - navigation events used: none observed
      - authentication guard: no
    - Stack.Screen name: Main -> `mobile/screens/Dashboard.tsx`
      - params: none declared
      - file missing
      - navigation events used: none observed
      - authentication guard: no

PaySys routes that do not exist yet and will need to be added:

- /wallet/send
- /wallet/receive
- /wallet/history
- /merchant/dashboard
- /merchant/qr
- /scan
- /payment/confirm
- /payment/receipt
- /settings/security
- /onboarding/phone
- /onboarding/otp
- /onboarding/profile-setup

Route naming conflicts observed:

- `shared/constants/index.ts` defines `Home`, `Wallet`, `Transactions`, and `Merchants`, but the live navigator currently uses `Splash` and `Main`.
- `Main` points to a missing `Dashboard` screen, so the route tree is incomplete.

## 5. Component Inventory

| Component / Module  | Location                            | Styling / approach            | Status                                                 |
| ------------------- | ----------------------------------- | ----------------------------- | ------------------------------------------------------ |
| StartupCoordinator  | mobile/app/StartupCoordinator.tsx   | inline style for loading view | KEEP for bootstrapping, but extend with real providers |
| RootNavigator       | mobile/navigation/RootNavigator.tsx | no styling                    | REPLACE or extend into auth/app stacks                 |
| AppProvider         | mobile/providers/AppProvider.tsx    | no styling                    | EXTEND after adding missing provider dependencies      |
| SplashScreen        | mobile/screens/SplashScreen.tsx     | inline style                  | KEEP as placeholder, extend into real splash UX        |
| createApiClient     | mobile/services/network.ts          | no UI styling                 | EXTEND with env-driven base URL and interceptors       |
| useSessionStore     | mobile/state/stores.ts              | no UI styling                 | EXTEND into auth/session store                         |
| usePreferencesStore | mobile/state/stores.ts              | no UI styling                 | EXTEND into ui/theme preferences store                 |
| createMMKVAdapter   | mobile/storage/adapter.ts           | no UI styling                 | EXTEND into real secure storage adapter                |
| tokens              | mobile/theme/tokens.ts              | token definitions only        | KEEP as design foundation                              |
| ThemeRegistry       | mobile/theme/registry.ts            | token access only             | KEEP, but extend with theme variants                   |

No component library, styled-components, Tamagui, NativeWind, or React Native Paper usage was observed.

## 6. State Management Architecture

Observed Zustand stores in `mobile/state/stores.ts`:

- `useSessionStore`
  - state: `initialized: boolean`
  - action: `setInitialized(v: boolean)`
  - persistence: none observed
- `usePreferencesStore`
  - state: `darkMode: boolean`
  - action: `setDarkMode(v: boolean)`
  - persistence: none observed

PaySys-required stores that are missing:

- authStore
- walletStore
- transactionStore
- offlineQueueStore
- merchantStore
- uiStore
- notificationStore

State shape conflicts:

- The current stores do not yet represent auth tokens, wallet balances, transaction history, offline queue metadata, merchant profile data, or notification settings.

## 7. API / Data Layer Map

Observed HTTP-related code:

1. `mobile/services/network.ts`

   - method: client factory for all future methods
   - base URL: function argument defaults to an empty string
   - request handling: request interceptor returns config unchanged
   - response handling: response interceptor passes through or rejects
   - auth header: none
   - loading state: none
   - error state: none
   - retry logic: none
   - timeout: 10000 ms

2. `backend/src/main/java/com/payments/backend/health/HealthController.java`
   - GET `/health`
   - GET `/readiness`
   - GET `/liveness`
   - auth header: none
   - loading/error handling: Spring MVC response handling only

Configuration and wiring observations:

- `PaySys/.env.example` defines `API_URL`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `ENVIRONMENT`.
- `docs/CONFIG.md` and `scripts/load-config.js` refer to environment loading, but `createApiClient` is not wired to `API_URL`.
- No interceptor logic for auth token injection, retries, or timeout policy beyond the fixed 10 second client timeout.

## 8. Backend Architecture

Confirmed backend shape:

- Framework: Spring Boot 3.2.2
- Language: Java 21
- Build: Gradle
- Module structure: modular monolith skeleton with package-based domains

Confirmed runtime packages:

- `config` - environment loader
- `errors` - error model and global exception advice
- `health` - health/readiness/liveness controller
- `infrastructure` - placeholder
- `module` - module contract and registry
- `observability` - placeholder metrics and Sentry adapters
- `security` - CORS filter config
- `startup` - application lifecycle coordinator

Database state:

- No ORM, JDBC driver, datasource configuration, entity classes, repositories, or migration system were found in the backend source tree.
- `docker-compose.yml` provisions PostgreSQL 15, but the backend code does not yet bind to a concrete persistence stack.

## 9. Type System Health

Confirmed TypeScript config health:

- strict mode: enabled in `tsconfig.base.json`
- path aliases: `@shared/*` and `@mobile/*`
- module target: ESNext
- include/exclude: workspace includes in `tsconfig.json`, no explicit exclude list in the base config

Type safety issues observed:

- The mobile workspace has no `package.json`, so the type graph is incomplete at the manifest level.
- Several imported symbols are missing from the workspace (`Dashboard`, provider components, `react-native` runtime packages), which will break type resolution and runtime compilation.
- The current codebase is better described as strict-configured but unresolved rather than fully type-safe.

TypeScript health score: POOR

## 10. Design System Status

Confirmed tokens from `mobile/theme/tokens.ts` and `mobile/theme/design-tokens.md`:

- Primary background: `#0A0A0A`
- Surface: `#121212`
- Text: `#FFFFFF`
- Muted text: `#9E9E9E`
- Font family: Inter
- Font sizes: 12, 14, 16, 20, 24
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius scale: 4, 8, 16
- Motion: 150, 250, 400 ms

Missing or incomplete design-system pieces:

- No shadow scale was defined.
- No light theme was defined; current tokens are dark-first only.
- No font-loading implementation was found.
- No theme provider implementation was found.
- Token access is centralized, but styling remains mostly inline and minimal.

## 11. Testing Coverage

Observed tests:

| Test file                                                      | What it tests                              | Approx assertions | Status                            |
| -------------------------------------------------------------- | ------------------------------------------ | ----------------: | --------------------------------- |
| `mobile/tests/run-tests.js`                                    | existence checks for mobile scaffold files |               low | PASS on presence checks           |
| `backend/src/test/java/com/payments/backend/StartupTests.java` | Spring context bootstrapping               |               low | PASS as a context-load smoke test |

Testing infrastructure summary:

- Test runner: custom Node smoke script plus JUnit 5 via Gradle
- Testing library: none observed for UI tests
- E2E: none observed
- Coverage tooling: none observed
- Coverage thresholds: none observed

## 12. CI/CD Status

Observed pipelines in `.github/workflows`:

- `ci.yml`
- `phase1-checks.yml`
- `phase-2-ci.yml`

Build and release status:

- CI exists and runs on push and pull request events.
- No deployment workflow was observed.
- No release signing, app signing, or OTA update channel configuration was observed.
