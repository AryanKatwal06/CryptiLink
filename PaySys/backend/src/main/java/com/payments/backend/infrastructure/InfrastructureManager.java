package com.payments.backend.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class InfrastructureManager {
    private static final Logger log = LoggerFactory.getLogger(InfrastructureManager.class);

    public void init() {
        log.info("InfrastructureManager: init (placeholders)");
    }
}
