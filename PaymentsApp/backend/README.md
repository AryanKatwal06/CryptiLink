# backend/

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
