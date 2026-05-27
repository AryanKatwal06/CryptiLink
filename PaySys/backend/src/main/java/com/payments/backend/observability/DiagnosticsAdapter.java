package com.payments.backend.observability;

public final class DiagnosticsAdapter {
    private DiagnosticsAdapter() {
    }

    public static void log(String message) {
        System.out.println("[PaySys][Diagnostics] " + message);
    }
}