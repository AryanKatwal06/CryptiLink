# RBI Regulatory Sandbox Pre-Application Document
*Cohort: Retail Payments*

## 1. Entity Description
**Applicant:** Aryan Katwal
**Profile:** Individual Developer / Student Project
**Affiliation:** B.Tech Computer Science, VIT Bhopal
**Project Name:** CryptiLink

## 2. Problem Statement
Despite the unprecedented success of the UPI infrastructure in advancing financial inclusion, a critical accessibility gap remains in environments with congested, weak, or zero cellular connectivity (e.g., rural markets, transit hubs, basement retail). In these scenarios, the mandatory multi-node synchronous network handshake required by standard UPI frequently results in transaction timeouts. Existing offline payment solutions, such as UPI Lite X, structurally demand NFC capabilities on both the consumer device and the merchant terminal. This hardware dependency excludes over 40% of the active smartphone market in India's emerging sectors and renders the millions of deployed static paper QR codes obsolete, creating an insurmountable deployment barrier for small merchants.

## 3. Proposed Solution Description
CryptiLink is a hardware-independent offline payment protocol designed to operate over existing infrastructure. It enables consumers to scan standard, printed UPI QR codes using their device camera and authenticate a transaction locally. The payment intent is cryptographically signed entirely on-device and transmitted to the merchant via zero-data fallback channels: a highly optimized 84-byte binary SMS payload (utilizing the GSM voice control channel) or an ultrasonic acoustic FSK modem. The merchant's application intercepts this payload and conducts full offline verification in under 200 milliseconds. Transactions are locally marked as `OFFLINE_VERIFIED` and asynchronously uploaded in batches to the acquiring bank for final settlement once network connectivity is restored.

## 4. Technology Used
*   **Cryptography:** ECDSA with NIST P-256 (prime256v1) for all digital signatures, ensuring minimal payload footprint.
*   **Hardware Security:** Android Keystore integration leveraging StrongBox (FIPS 140-2 Level 2 certified where available) for isolated private key generation and secure signing operations.
*   **Data Transport:** Reed-Solomon (15,11) over GF(2^4) forward error correction applied to the acoustic channel to tolerate environmental noise corruption. Compact binary representations for SMS to fit within a single PDU frame.
*   **Backend Infrastructure:** Node.js settlement engine backed by PostgreSQL with strict row-level locking for concurrency control.

## 5. Risk Identification and Mitigation
The primary risk in any asynchronous offline payment system is the "double-spend" vulnerability. CryptiLink mitigates this through a rigorously bounded-risk architecture utilizing a three-layer cap enforcement design:
1.  **On-Device Pre-Signing Check:** The consumer app maintains a secure sequence counter and refuses to generate a signature if the transaction exceeds the ₹200 per-transaction cap or the ₹500 cumulative offline exposure limit.
2.  **Merchant Offline Verifier:** The merchant application tracks the highest sequence counter observed per wallet. It rejects out-of-order sequences (replay attacks) and maintains a local cumulative tally to reject transactions attempting to breach the ₹500 limit.
3.  **Bank Settlement Engine:** The server utilizes strict database row-level locking (`SELECT ... FOR UPDATE`) during batch settlement. Concurrent batches cannot read stale exposure values, guaranteeing the absolute enforcement of the cumulative limit before merchant crediting occurs.

## 6. Customer Protection Measures
*   **Biometric Authorization:** Every offline transaction requires explicit biometric authentication (fingerprint/face) via the Android BiometricPrompt API prior to accessing the Keystore signing key.
*   **Certificate Expiry:** Offline certificates are inherently short-lived (e.g., 24 hours). Funds cannot be indefinitely held or spent offline if a device is lost or compromised over a long period.
*   **Sequence-Based Replay Prevention:** Strict sequence validation inherently protects against malicious payload interception and replay.
*   **Transparent UI Distinctions:** The merchant and consumer applications explicitly distinguish between `OFFLINE_VERIFIED` (pending bank reconciliation) and `SETTLED` (finalized) states, preventing confusion regarding ledger finality.

## 7. Exit and Unwinding Plan
In the event of a critical system failure, regulatory directive, or customer dispute requiring immediate cessation of services, CryptiLink supports instant fund unwinding. Because offline funds are technically held in a bank-side escrow ledger against a specific wallet certificate, the bank can unilaterally revoke the active certificate. Once revoked, the escrowed liquid balance is instantly returned to the consumer's primary liquid account. Any subsequent merchant settlement attempts utilizing the revoked certificate will be systematically rejected by the bank engine.

## 8. Measurable Success Criteria for Sandbox Testing
To graduate from the Regulatory Sandbox, the CryptiLink prototype will be evaluated against the following strict performance metrics:
*   **Verification Accuracy:** 99.5% successful offline verification rate for uncorrupted payloads.
*   **Fraud Prevention:** Absolute zero (0) successful double-spends exceeding the ₹500 cumulative cap at the settlement layer.
*   **Performance Latency:** Sub-200ms offline verification latency on the merchant device at the 95th percentile.
*   **Channel Resilience:** Greater than 95% successful payload delivery over the acoustic channel in standard ambient noise environments (below 65 dB).
