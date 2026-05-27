package com.payments.backend.startup;

import com.payments.backend.module.Module;
import com.payments.backend.module.ModuleRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.boot.context.event.ApplicationReadyEvent;

import java.time.Instant;
import java.util.Map;

@Component
public class StartupCoordinator {
    private static final Logger log = LoggerFactory.getLogger(StartupCoordinator.class);
    private final ModuleRegistry registry;
    private final Instant startedAt = Instant.now();

    @Value("${app.name:payments-backend}")
    private String appName;

    public StartupCoordinator(ModuleRegistry registry) {
        this.registry = registry;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        log.info("StartupCoordinator: beginning startup sequence for {}", appName);
        loadEnvironment();
        validateConfig();
        initializeModules();
        startModules();
        log.info("StartupCoordinator: ready — startedAt={} modules={}", startedAt, registry.all().keySet());
    }

    private void loadEnvironment() { log.debug("Loading environment (placeholders only)"); }
    private void validateConfig() { log.debug("Validating config (placeholders only)"); }
    private void initializeModules() {
        for (Map.Entry<String, Module> e : registry.all().entrySet()) {
            try {
                log.info("Initializing module {}", e.getKey());
                e.getValue().init();
            } catch (Exception ex) {
                log.error("Module init failed {}", e.getKey(), ex);
            }
        }
    }

    private void startModules() {
        for (Map.Entry<String, Module> e : registry.all().entrySet()) {
            try {
                log.info("Starting module {}", e.getKey());
                e.getValue().start();
            } catch (Exception ex) {
                log.error("Module start failed {}", e.getKey(), ex);
            }
        }
    }

    public Instant startedAt() { return startedAt; }
}
