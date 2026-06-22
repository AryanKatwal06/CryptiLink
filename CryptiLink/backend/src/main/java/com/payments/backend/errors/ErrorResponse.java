package com.payments.backend.errors;

public class ErrorResponse {
    public final String error;
    public final String message;
    public final String code;
    public final String timestamp;

    public ErrorResponse(String error, String message, String code, String timestamp) {
        this.error = error;
        this.message = message;
        this.code = code;
        this.timestamp = timestamp;
    }
}
