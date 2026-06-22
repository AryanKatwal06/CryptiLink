# CryptiLink: Security Architecture and Threat Model

This document outlines the cryptographic primitives, trust boundaries, and structural risk mitigations that secure the CryptiLink offline payment protocol.

## 1. Threat Model

CryptiLink operates in inherently untrusted environments utilizing unencrypted, broadcast-capable transport channels (SMS and acoustic FSK). As such, the threat model explicitly delineates in-scope vulnerabilities from out-of-scope systemic carrier risks.

### In-Scope Threats (Defended)
*   **Payload Interception (Man-in-the-Middle):** An attacker intercepting the acoustic audio signal or SMS payload cannot modify the transaction amount, sequence, or merchant ID. The payload is secured by an ECDSA signature over the transaction bytes. Modification invalidates the signature.
*   **Replay Attacks:** An attacker capturing a valid audio transmission and replaying it to the merchant terminal is defended by a strict sequence counter mechanism. The merchant verifier maintains the highest sequence counter observed per wallet; duplicate or lower sequence numbers are immediately rejected.
*   **Offline Double-Spending:** A consumer attempting to spend their offline balance simultaneously at multiple disconnected merchants is the primary vulnerability. This is mitigated, though mathematically unsolvable offline, via the strict 3-layer Cap Enforcement Architecture (detailed below).
*   **Device Compromise (Malware):** If the consumer's operating system is compromised by malware, the attacker cannot extract the private signing key, as it is generated and bounded within the Android Hardware Keystore (StrongBox).

### Out-of-Scope Threats (Accepted Carrier/OS Risks)
*   **SIM Cloning / Spoofing:** SMS payloads rely on the telecom provider's infrastructure. If an attacker clones a SIM card to intercept or spoof SMS messages at the carrier level, this falls outside the application-layer security boundary.
*   **Physical Coercion:** If an attacker physically forces a consumer to unlock their device via biometrics and authorize a transaction, the hardware enclave cannot distinguish this from legitimate intent. Risk is mitigated solely by the ₹500 cumulative cap.

## 2. The Certificate Trust Chain

CryptiLink establishes offline trust without requiring merchants to maintain large synchronized databases. This is achieved via a strict hierarchical certificate chain:

1.  **Bank Private Key:** The settlement engine possesses the master private key.
2.  **Signed Certificate:** During the online "vault loading" phase, the bank generates a `SignedCertificate`. This JSON payload binds the consumer's public key, the wallet ID, the authorized offline exposure limit, and an expiry timestamp, signed by the Bank Private Key.
3.  **Consumer Public Key:** Generated on the consumer device, the public key is trusted by the merchant *only* because it is presented alongside the valid bank-signed certificate.
4.  **Transaction Signature:** The consumer uses their hardware-isolated private key to sign the specific transaction details.

When a merchant receives a payload, they verify the Bank Signature on the certificate. If valid, they extract the Consumer Public Key from that certificate and use it to verify the Transaction Signature.

## 3. The Three-Layer Cap Enforcement Architecture

Because true double-spending cannot be prevented offline, CryptiLink bounds the risk through redundant enforcement layers. An attacker attempting a double-spend must circumvent all three layers to successfully defraud the system:

1.  **On-Device Pre-Signing Check:** The consumer app monitors the cumulative spent amount against the certificate's `max_offline_limit`. It flatly refuses to invoke the Android Keystore signing operation if the transaction would exceed this limit.
2.  **Merchant Offline Verifier:** The merchant application acts as an independent ledger. Even if a consumer modifies their local app to bypass the pre-signing check, the merchant application tracks cumulative exposure for that specific wallet ID. Any transaction that pushes the total observed exposure beyond the certificate's limit is rejected as `EXCEEDS_CUMULATIVE_EXPOSURE_CAP`.
3.  **Bank Settlement Engine:** The ultimate arbiter. When merchants upload their batches, the settlement engine uses strict PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) on the `wallet_exposure` table. This prevents race conditions where concurrent settlement batches might both read a stale exposure value. Transactions exceeding the cap at the settlement layer are permanently rejected, shifting the final liability to the merchant if they accepted an invalid offline transaction.

## 4. Hardware Isolation: The Role of the Android Keystore

CryptiLink does not store private keys in application storage or SharedPreferences. Keys are generated exclusively within the Android Keystore system. Where supported by device hardware, CryptiLink explicitly requests `StrongBox` backing.

This means the private key material resides in a dedicated secure processor (an HSM or TEE) separate from the main CPU. The Android OS itself, and by extension any malware operating with root privileges, cannot read the raw key bytes. The application can only hand a transaction payload to the secure enclave and receive a signature in return, and only after the hardware verifies a positive biometric prompt. This guarantees that a compromised phone cannot be silently milked for fraudulent offline signatures in the background.

## 5. Known Limitations and Accepted Risks

CryptiLink trades absolute synchronization for extreme availability. The accepted risks include:
*   **Micro-Transaction Constraint:** The system is explicitly designed for high-frequency, low-value transactions. The ₹500 cumulative cap makes it unsuitable for retail sectors beyond basic daily commerce.
*   **Acoustic Environmental Sensitivity:** The acoustic fallback channel relies on device audio hardware fidelity. Background noise exceeding certain decibel thresholds will result in high symbol corruption rates, requiring the consumer to fall back to the SMS transport layer.
*   **Asynchronous Merchant Liability:** Between the moment of `OFFLINE_VERIFIED` and the moment of batch settlement, the merchant assumes the risk of a highly sophisticated coordinated double-spend attack across multiple physical locations. The strict ₹500 cap limits this potential loss to an amount deemed acceptable for immediate checkout convenience.
