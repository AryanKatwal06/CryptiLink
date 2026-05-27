# ADR-004: Styling Approach

## Status

Accepted

## Context

Phase 0 found that the mobile UI foundation uses `StyleSheet`-style inline/native styling and token constants in `mobile/theme/tokens.ts`.

## Decision

PaySys will keep native React Native styling backed by the existing token layer.

## Rationale

- The current codebase does not use a component styling framework.
- The token file already establishes colors, spacing, radius, and motion.
- Keeping native styling minimizes churn while the design system matures.

## Implications

- New UI will consume tokens rather than hardcoded values.
- Shared theme primitives will be added before introducing heavier abstraction.
- If a styling library is introduced later, it must adapt to the token system rather than replace it.
