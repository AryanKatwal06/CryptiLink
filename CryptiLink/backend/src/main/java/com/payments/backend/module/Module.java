package com.payments.backend.module;

public interface Module {
    String name();
    void init();
    void start();
    void stop();
    ModuleState state();
}

enum ModuleState {
    LOADED, INITIALIZED, STARTED, STOPPED, FAILED
}
