# ADR-006: Free Tier Architecture

## Status

Accepted

## Context

Phase 0.5 requires that all external services remain free-tier only.

## Decision

CryptiLink will use only free or local development services in this phase.

## Rationale

- The repository currently uses local Postgres and Redis containers for development.
- GitHub Actions is already available as a free CI platform for this repository.
- No paid SaaS integration is required to complete the foundation phase.

## Implications

- Any future paid service must be explicitly justified and approved before adoption.
- If usage grows beyond free-tier limits, the cost trigger must be documented before upgrading.
- Current development and validation should continue to rely on local or free-tier infrastructure only.
