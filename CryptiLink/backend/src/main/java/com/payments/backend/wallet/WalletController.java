package com.payments.backend.wallet;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/wallet")
public class WalletController {
    @GetMapping("/balance")
    public ResponseEntity<Map<String, String>> balance() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("status", "stub"));
    }

    @PostMapping("/transfer")
    public ResponseEntity<Map<String, String>> transfer() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("status", "stub"));
    }

    @GetMapping("/history")
    public ResponseEntity<Map<String, String>> history() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("status", "stub"));
    }
}