# ADR-001: Navigation Library Choice

## Status

Accepted

## Context

Phase 0 identified that the active mobile navigation code uses React Navigation imports in `mobile/navigation/RootNavigator.tsx`.

## Decision

CryptiLink will keep React Navigation as the navigation library.

## Rationale

- The current mobile shell already imports `@react-navigation/native` and `@react-navigation/stack`.
- Keeping the existing library avoids a disruptive rewrite of the navigation shell.
- The current stack model is compatible with the planned auth and app route separation.

## Implications

- New screens will be added under the existing stack-based navigation model.
- Route names and params will be typed as the navigation tree expands.
- Any future migration to another router would require a dedicated phase and a compatibility plan.
