# ADR-003: API Layer Architecture

## Status

Accepted

## Context

The current mobile service layer already uses an Axios client factory in `mobile/services/network.ts`.

## Decision

PaySys will use Axios for HTTP transport and TanStack Query for server-state orchestration.

## Rationale

- Axios is already wired into the mobile service layer.
- TanStack Query fits request caching, retries, and loading/error state for server data.
- Keeping the transport layer separate from query state keeps the app easier to reason about.

## Implications

- API calls will live under `mobile/services/`.
- Query logic will remain in provider/hook layers, not inside screens.
- Authentication headers and error handling will be centralized in the client interceptor layer.
