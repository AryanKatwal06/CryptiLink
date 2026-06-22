# ADR-002: State Management Choice

## Status

Accepted

## Context

The mobile scaffold already uses Zustand stores in `mobile/state/stores.ts`.

## Decision

CryptiLink will use Zustand for local client state.

## Rationale

- The codebase already uses Zustand, so the foundation is present.
- Zustand keeps state slices small and explicit, which suits wallet, auth, UI, and queue state.
- It is lightweight and works well with a modular mobile shell.

## Implications

- Stores will be organized by domain slice rather than by screen.
- Persistence will be handled through a storage adapter instead of embedding storage logic in UI components.
- Redux or Jotai are not introduced in this phase.
