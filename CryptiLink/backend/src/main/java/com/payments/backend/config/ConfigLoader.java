package com.payments.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

@Component
public class ConfigLoader {
    private static final Logger log = LoggerFactory.getLogger(ConfigLoader.class);
    private final Properties properties = new Properties();

    public ConfigLoader() {
        loadDotEnvIfExists(".env.local");
        loadDotEnvIfExists(".env.development");
        loadDotEnvIfExists(".env.staging");
        loadDotEnvIfExists(".env.production");
    }

    private void loadDotEnvIfExists(String filename) {
        try {
            Path p = Path.of(filename);
            if (Files.exists(p)) {
                try (InputStream in = new FileInputStream(p.toFile())) {
                    properties.load(in);
                    log.info("Loaded env from {}", filename);
                }
            }
        } catch (Exception e) {
            log.debug("No env file {}: {}", filename, e.getMessage());
        }
    }

    public String get(String key, String def) {
        return properties.getProperty(key, System.getenv().getOrDefault(key, def));
    }
}
