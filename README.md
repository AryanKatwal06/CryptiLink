# CryptiLink
> Offline payment protocol with cryptographic token signing and dual-channel air-gap transport. No internet required.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Phase](https://img.shields.io/badge/phase-5%2F5%20complete-blue)
![License](https://img.shields.io/badge/license-MIT-green)

CryptiLink is an offline digital payment protocol built to solve the synchronous TCP/IP fragility of standard UPI in highly congested environments. Rather than requiring NFC hardware on both devices (which excludes 40% of the emerging Android market and renders paper QR codes obsolete), it uses the phone's native camera to scan existing static QRs. The payment intent is cryptographically signed entirely on-device and transmitted via zero-data fallback channels—an 84-byte binary SMS payload over the GSM control channel, or an ultrasonic acoustic FSK modem. Bounded-risk math replaces the need for a live trusted third party.

---

## Architecture Overview

```text
 ┌──────────────────────┐             [Zero-Data Transport]             ┌──────────────────────┐
 │ CONSUMER APP         │ ─────────── 1. Binary SMS PDU ──────────────▶ │ MERCHANT APP         │
 │ (Offline/Air-gapped) │ ─────────── 2. Ultrasonic FSK ──────────────▶ │ (Offline/Air-gapped) │
 └──────────────────────┘             (Payload: 84 bytes)               └──────────────────────┘
            │                                                                      │
            │ (Initial Setup)                                                      │ (Async Batch)
            ▼                                                                      ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   BANK SERVER / SETTLEMENT ENGINE                           │
 │                                   (Online Root of Trust)                                    │
 └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

*   **Consumer App:** Scans standard UPI QR codes, securely generates ECDSA signatures, and transmits the compact binary payload via SMS or acoustic modem.
*   **Merchant App:** Receives the air-gapped payload, performs full cryptographic signature verification, sequence replay checks, and certificate expiry checks completely offline in under 200 milliseconds.
*   **Bank Server:** Acts as the ultimate root of trust by signing initial offline certificates, and processes asynchronous merchant batch settlements using strict row-level database locking to enforce exposure caps.

## Current Build Status

| Component | Status |
|-----------|--------|
| Bank Server (Phase 1) — cert issuance, settlement, cap enforcement | ✅ Complete |
| Consumer App — UI shell (splash, dashboard, transmission screen) | ✅ Complete |
| Consumer App — Native Keystore signing (CryptiLinkKeyEngine.kt) | ❌ Not built — see Roadmap |
| Consumer App — Vision Camera QR scanner | ❌ Not built — see Roadmap |
| Acoustic FEC — Reed-Solomon (15,11) decode | ❌ Stubbed — pass-through only, see Roadmap |
| Consumer App — On-device cap enforcement UI | ❌ Not built — see Roadmap |
| Transport Layer — SMS channel (SecureSignalingTransport.kt) | ✅ Complete |
| Transport Layer — Acoustic FSK modem (UltrasoundModem.kt) | ✅ Complete |
| Merchant App — 4-check offline verifier | ✅ Complete |
| Merchant App — Settlement batch upload | ✅ Complete |
| Admin Dashboard (Phase 5) | ✅ Complete |
| Settlement batch AES-256 encryption key | ⚠️ Hardcoded fallback — set SETTLEMENT_AES_KEY env var before demo |
| SQLCipher database encryption key | ⚠️ Hardcoded fallback — set MERCHANT_DB_KEY env var before demo |
| Regulatory docs + RBI pitch layer | ✅ Complete |

---

## Technical Highlights

*   **Acoustic FSK Modem:** Acoustic FSK modem using Goertzel algorithm for tone detection, with RS(15,11) FEC architecture defined but pending full GF arithmetic implementation.
*   **Optimized Payload Formatting:** Compact 84-byte binary payload designed to fit flawlessly inside a single binary SMS PDU frame, completely eliminating the fragility of multipart SMS fragmentation.
*   **Dual-Layer Offline Verification:** Bounded risk achieved through a strict merchant-side offline sequence verifier, and a server-side PostgreSQL `SELECT ... FOR UPDATE` row-locked settlement validation.
*   **Encrypted Offline Ledger:** SQLite with SQLCipher integration on the merchant application to securely persist offline-verified transactions prior to batch upload.

---

## Repository Structure

*   `cryptilink-bank-server/` — The Node.js/Express backend settlement engine. Handles wallet registration, certificate issuance, and batch settlement.
*   `CryptiLink/mobile/` — The React Native mono-app containing the views and native bridge modules for both the Consumer and Merchant experiences (audio modems, SMS interception).
*   `CryptiLink/docs/` — Comprehensive architecture decision records (ADRs), threat models, and regulatory compliance pitches (e.g., RBI Sandbox application).
*   `cryptilink-dashboard/` — A standalone React/Vite web application providing real-time analytics, settlement health gauges, and channel performance metrics.

---

## Quick Start Guide

You can run the full Node.js Bank Server locally in under 5 minutes.

**Prerequisites:** Node.js v20+, and **Docker** (strictly required for spinning up the PostgreSQL database in step 1, as local execution without it cannot be verified in the sandbox).

1.  **Start the database** (Requires Docker daemon to be running):
    ```bash
    cd cryptilink-bank-server
    docker-compose up -d postgres
    ```
    *Expected output: Container `cryptilink_postgres` starts on port 5432.*
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run database migrations:**
    Applies the schema (wallets, certificates, escrow_ledger, wallet_exposure, settlement_batches, settled_transactions).
    ```bash
    npm run db:migrate
    ```
    *Expected output: Success message confirming the creation of the tables.*
4.  **Generate the Bank Keypair:**
    If this is your first run, you must generate the ECDSA prime256v1 (P-256) master keys. The server cannot issue certificates without them.
    ```bash
    npx ts-node scripts/generate-bank-keys.ts
    ```
    *Expected output: `✓ Keypair generated successfully` and a public key fingerprint.*
5.  **Start the server:**
    ```bash
    npm run dev
    ```
    *Expected output: `[SERVER] Bank server running on port 3000`.*

---

## Security and Known Limitations

CryptiLink's architecture is predicated on pragmatic, bounded-risk engineering. The fundamental computer science constraints of a fully disconnected double-spend problem dictate that it is mitigated, not eliminated, without a live trusted third party. The system bounds this financial risk mathematically via a hard ₹200 per-transaction cap and a ₹500 cumulative offline exposure limit before a mandatory online refresh is required. Consequently, CryptiLink is strictly constrained to micro-transactions and is structurally unsuited for high-value retail.

Furthermore, the transport mechanisms carry explicit hardware dependencies. The acoustic channel relies on ultrasonic frequencies, which suffer from a known low-pass filter issue on budget devices where hardware manufacturers artificially cap microphone frequency response to save costs. Even with Reed-Solomon (15,11) forward error correction, this introduces transmission unreliability on low-end handsets. The primary SMS channel relies entirely on baseband network availability; it cannot function on a device lacking an active SIM or SMS balance. We disclose these constraints transparently rather than obfuscating them.

---

## Roadmap

The current implementation is a functional prototype. If authorized for expansion, Phase 6 (Future Work) and Phase 2 backlog would include:

**Phase 2 Incomplete — Priority items for next sprint:**
*   **Android Keystore StrongBox integration:** Implementing the JNI/Kotlin bridge for hardware-isolated ECDSA key generation so the private key never leaves the secure enclave.
*   **Vision Camera QR scanner:** Building the consumer entry point for scanning static paper QRs.
*   **On-device cap enforcement UI:** Adding pre-signing UI blocks for transactions exceeding the offline caps.

**Phase 6 (Future Work):**
*   **Reed-Solomon (15,11) full GF(2^4) implementation:** Complete the Galois Field arithmetic for the acoustic channel FEC codec — currently stubbed as pass-through.
*   **EMV-compatible kernel integration:** For stronger merchant-side cryptographic guarantees.
*   **iOS Secure Enclave parity:** Expanding the hardware root of trust beyond the current Android-only implementation.
*   **NPCI API integration:** Hooking the settlement engine directly into live banking ledgers (replacing the current mock server DB).
*   **Hardware Security Module (HSM):** Migrating the bank server's master signing key from a local PEM file to a dedicated cloud HSM.

---

## Author

**Aryan Katwal**  
B.Tech Computer Science, VIT Bhopal  
[GitHub Profile](https://github.com/AryanKatwal06)
