package com.payments.backend.module;

import org.springframework.beans.factory.ListableBeanFactory;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ModuleRegistry {
    private final Map<String, Module> modules = new ConcurrentHashMap<>();

    public ModuleRegistry(ListableBeanFactory beanFactory) {
        Map<String, Module> found = beanFactory.getBeansOfType(Module.class);
        if (found != null) {
            found.values().forEach(m -> modules.put(m.name(), m));
        }
    }

    public Map<String, Module> all() { return Collections.unmodifiableMap(modules); }

    public Module get(String name) { return modules.get(name); }
}
