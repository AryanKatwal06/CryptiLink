package com.payments.backend.health;

import com.payments.backend.module.ModuleRegistry;
import com.payments.backend.startup.StartupCoordinator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping
public class HealthController {
    private final StartupCoordinator coordinator;
    private final ModuleRegistry registry;

    public HealthController(StartupCoordinator coordinator, ModuleRegistry registry) {
        this.coordinator = coordinator;
        this.registry = registry;
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        Map<String, Object> r = new HashMap<>();
        r.put("build", System.getProperty("app.version", "0.1.0"));
        r.put("startedAt", coordinator.startedAt().toString());
        r.put("modules", registry.all().keySet());
        r.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(r);
    }

    @GetMapping("/readiness")
    public ResponseEntity<?> readiness() {
        return ResponseEntity.ok(Map.of("status", "ready"));
    }

    @GetMapping("/liveness")
    public ResponseEntity<?> liveness() {
        return ResponseEntity.ok(Map.of("status", "alive"));
    }
}
