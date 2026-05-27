package com.payments.backend.merchant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/merchant")
public class MerchantController {
    @GetMapping("/profile")
    public ResponseEntity<Map<String, String>> profile() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("status", "stub"));
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, String>> create() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("status", "stub"));
    }

    @GetMapping("/qr")
    public ResponseEntity<Map<String, String>> qr() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(Map.of("status", "stub"));
    }
}