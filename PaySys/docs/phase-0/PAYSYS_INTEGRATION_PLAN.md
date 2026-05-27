# PaySys - Integration Plan

# How new PaySys features integrate with existing codebase

## 1. What We Keep (Unchanged)

- `PaySys/shared/contracts/*` as the shared DTO and enum source of truth.
- `PaySys/shared/types/index.ts` as the common result/error envelope layer.
- `PaySys/shared/constants/index.ts` as the initial route/storage/network constant namespace.
- `PaySys/mobile/theme/tokens.ts` as the dark-first token foundation.
- `PaySys/mobile/theme/registry.ts` as the token access wrapper, once it is expanded rather than replaced.
- `PaySys/mobile/tests/run-tests.js` as a lightweight smoke gate until proper test infrastructure is introduced.
- `PaySys/backend/src/main/java/com/payments/backend/health/HealthController.java` as the basic operational health surface.
- `PaySys/backend/src/main/java/com/payments/backend/config/ConfigLoader.java` as the environment loading entrypoint, once key names are standardized.
- `PaySys/backend/src/main/java/com/payments/backend/errors/GlobalExceptionHandler.java` as the global error envelope pattern.
- Tooling files: `tsconfig.base.json`, `tsconfig.json`, `.eslintrc.json`, `.prettierrc`, `.dependency-cruiser.js`, `turbo.json`.

## 2. What We Extend (Modified but not replaced)

- `mobile/app/StartupCoordinator.tsx`
  - Replace placeholder readiness delay with real startup steps.
  - Integrate provider initialization, config validation, and auth/bootstrap sequencing.
- `mobile/navigation/RootNavigator.tsx`
  - Expand from `Splash`/`Main` into auth and authenticated stacks.
  - Add route params and guard logic.
- `mobile/services/network.ts`
  - Bind the base URL to a validated env value.
  - Add auth-token injection, retry rules, and typed response/error handling.
- `mobile/state/stores.ts`
  - Split the current two minimal stores into auth, wallet, transaction, queue, merchant, UI, and notification slices.
- `mobile/storage/adapter.ts`
  - Replace the null adapter with a real secure storage implementation.
- `mobile/theme/tokens.ts`
  - Extend token sets with shadows, semantic colors, and theme variants.
- `backend/src/main/java/com/payments/backend/startup/StartupCoordinator.java`
  - Keep the lifecycle orchestration, but wire real module implementations into it.
- `backend/src/main/java/com/payments/backend/module/ModuleRegistry.java`
  - Keep the registry pattern, but register real domain modules instead of placeholders.
- `backend/src/main/java/com/payments/backend/security/SecurityConfig.java`
  - Replace wildcard CORS with environment-specific origin lists.
- `backend/src/main/java/com/payments/backend/observability/*`
  - Replace stubs with real Micrometer and error-reporting integration when telemetry is required.

## 3. What We Replace (Deprecated)

- Placeholder providers referenced from mobile startup (`ThemeProvider`, `QueryProvider`, `StorageProvider`, `NotificationProvider`, `ErrorBoundary`) should be replaced with real implementations rather than copied forward as stubs.
- `mobile/screens/SplashScreen.tsx` should be replaced with a production splash/onboarding flow once the app shell exists.
- `mobile/navigation/RootNavigator.tsx` should stop using the missing `Dashboard` placeholder and move to actual route composition.
- `backend/src/main/java/com/payments/backend/observability/MetricsRegistry.java` and `SentryAdapter.java` should be replaced with functional integrations.
- `backend/analytics`, `auth`, `gateway`, `merchant`, `notifications`, `payments`, `users`, and `wallet` README-only folders should be replaced with actual source packages and classes.
- Stub Docker `tail -f /dev/null` commands should be replaced with real build/run commands once the app stacks are runnable.

## 4. What We Add (Net new)

### Phase 1 additions

- A real `mobile/package.json` with React Native runtime dependencies.
- `mobile/app.json` and, if needed, `mobile/eas.json`.
- `mobile/metro.config.js` and `mobile/babel.config.js`.
- Missing provider implementations and the `Dashboard` screen.
- Real auth/session/wallet/transaction/offline/merchant/UI/notification stores.
- Backend datasource configuration, migrations, repositories, and service layers.
- Domain controllers for auth, wallet, payments, merchant, users, notifications, and health extensions.

### Phase 2 additions

- Auth and onboarding screens (`phone`, `otp`, `profile setup`).
- Wallet send/receive/history screens.
- Merchant dashboard and QR screens.
- A typed navigation parameter list.
- Loading, error, and empty-state UI primitives.

### Phase 3 and later additions

- Payment confirmation and receipt flows.
- Offline queue processing.
- Push notification registration and preferences.
- Observability dashboards and telemetry hooks.
- CI artifacts for app builds and backend builds.

## 5. Naming Conventions Adopted

- Variables: camelCase.
- Types and components: PascalCase.
- Folder names: kebab-case where appropriate, matching existing React component file conventions.
- React component files: PascalCase file names.
- Shared DTOs and interfaces: `*DTO`, `*Model`, `*State`, and `*Response` suffixes.
- Backend packages: `com.payments.backend.*`.
- Route constants: uppercase names in `shared/constants/index.ts`.

## 6. Import Path Strategy

- Use `@shared/*` for cross-cutting TypeScript contracts and constants.
- Use `@mobile/*` only if the workspace retains that alias and the consuming package actually lives under the mobile tree.
- Keep intra-folder imports relative inside `mobile/` and `backend/` to avoid accidental layer leaks.
- In Java, use package-private and package-scoped organization under `com.payments.backend` rather than cross-package reach-through.
- Avoid importing backend code from mobile code directly; use API clients and shared contracts instead.

## 7. Styling Integration Strategy

- Treat `mobile/theme/tokens.ts` as the canonical token source.
- Keep the visual language dark-first.
- Add theme providers and semantic tokens before building wide-screen UI.
- Use Inter or Sora as the app font family; the current token file already prefers Inter.
- Add the missing shadow scale and semantic color mapping before expanding the component library.

## 8. State Integration Strategy

- Keep Zustand as the local state layer because the current stores already use it.
- Add a persistence adapter for auth and preferences state.
- Separate ephemeral UI state from durable session or wallet state.
- Keep shared DTOs as the wire shape and map them into store slices at the boundary.
- Use queue-based state for offline operations instead of mutating wallet state directly.

## 9. Navigation Integration Strategy

- Keep `RootNavigator` as the composition root for now.
- Replace the single `Splash`/`Main` stack with an auth stack and an app stack.
- Attach onboarding routes before authenticated wallet and merchant routes.
- Route data should be typed and use a single route constant source.
- The current `Main` route should be retired once real screen groups are added.
- Navigation entry points should come from startup decisions, not from screen components reaching into services directly.
