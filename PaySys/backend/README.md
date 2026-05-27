# PaySys Backend (Phase 3 foundation)

This folder contains the Phase 3 backend operating platform skeleton for PaySys.

Purpose

- Provide a modular monolith Spring Boot foundation for later business modules.

Ownership

- Platform / backend team.

Allowed imports

- Spring Boot, Micrometer, logging libraries, testing libs.

Forbidden imports

- Any business libraries (payment SDKs, DB models, auth implementations).

Future phase

- Phase 4 will implement business features on top of this foundation.

# backend/

Decision: Adopt Modular Monolith for PaySys to simplify evolution and deployment.
Purpose

- Java 21 + Spring Boot backend modules, gateways and domain modules.

Ownership

- Backend engineering

Allowed dependencies

- Java, Spring Boot, Gradle/Maven, monitoring libs.

Forbidden responsibilities

- Client UI, mobile app code.

Folder boundaries

- Each domain module is isolated and communicates via `../shared` contracts.
