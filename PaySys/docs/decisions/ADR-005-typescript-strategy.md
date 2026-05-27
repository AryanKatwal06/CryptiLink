# ADR-005: TypeScript Strategy

## Status

Accepted

## Context

The repository already has a strict TypeScript baseline in `tsconfig.base.json`, plus a few JS utility files that support the workspace.

## Decision

PaySys will keep the strict TypeScript baseline for new code and retain the existing JS utility files as legacy support.

## Rationale

- The project already uses strict TypeScript settings.
- Strict typing is required for navigation params, store slices, and shared DTOs.
- The current JS scripts are infrastructure-only and do not need conversion during this phase.

## Implications

- New files should be written in TypeScript.
- Shared types and contracts will remain in `shared/`.
- JS config files are allowed where they are needed for tooling bootstrap.
