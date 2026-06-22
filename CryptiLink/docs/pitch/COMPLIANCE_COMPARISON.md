# Regulatory Compliance and Technical Positioning

## Section 1: Executive Summary

Modern digital payments in India, primarily driven by the UPI infrastructure, have transformed the economic landscape. However, the system relies on a synchronous, real-time handshake across a minimum of five network nodes: the consumer's device, the PSP gateway, the NPCI switch, the remitter's core banking system (CBS), and the beneficiary's CBS. A single packet drop or latency spike anywhere in this chain causes transaction failure. In high-density environments like transit hubs and rural markets with congested cellular infrastructure, merchants consistently lose revenue to abandoned checkouts caused purely by network timeouts.

Existing offline solutions fail to address the realities of India's merchant ecosystem. UPI Lite X provides on-device offline wallets but strictly requires an NFC chipset on both ends. This immediately excludes over 40% of mid-to-low-tier Android devices in emerging markets. More critically, it is fundamentally incompatible with the tens of millions of static, printed paper QR codes currently deployed. Merchants would be forced to adopt expensive electronic reader terminals, establishing a massive deployment barrier. Other market attempts, such as USSD automation or IVR screen-scraping, operate in regulatory grey areas, compromise user security, and face imminent app store removal.

CryptiLink offers a hardware-independent paradigm shift for offline transactions. Consumers scan any existing printed paper UPI QR code using a standard phone camera—eliminating the need for NFC hardware. The signed transaction token is securely transmitted via two entirely offline channels: a binary SMS over the robust GSM voice control channel (using an optimized 84-byte payload) or an ultrasonic acoustic FSK modem in zero-signal environments. The merchant application subsequently performs full local cryptographic verification in under 200 milliseconds, ensuring authenticity, sequence integrity, and certificate validity without any active network dependency. By enforcing strict, financially managed risk limits (₹200 per transaction, ₹500 cumulative), CryptiLink makes offline digital payments universally accessible and secure.

## Section 2: Technical Comparison Table

| Criterion | UPI Lite X | Screen-Scraping (e.g., FlowPay) | CryptiLink |
| :--- | :--- | :--- | :--- |
| **Consumer Hardware Requirement** | NFC-enabled device mandatory | Standard smartphone | Standard smartphone (Camera + Mic/Speaker or GSM SIM) |
| **Merchant Hardware Requirement** | NFC reader terminal / smart soundbox | Varies (often requires active data connection) | Standard smartphone (Mic/Speaker or GSM SIM) |
| **Works with Printed Paper QR** | No | Yes | **Yes** |
| **Transport Mechanism** | Near Field Communication (NFC) | USSD / IVR / SMS automation | Dual-channel: Binary SMS (primary) & Acoustic FSK (fallback) |
| **Offline Signing Method** | Trusted Execution Environment / Secure Element | Passwords / PINs (Often insecurely cached) | ECDSA secp256r1 via Android Keystore StrongBox FIPS 140-2 |
| **Double-Spend Protection Mechanism** | Hardware-level secure element coordination | None / Server-side delayed reconciliation | 3-Layer: Pre-signing check, Merchant sequence verifier, Bank Row-Level locking |
| **Max Offline Exposure Per Consumer** | RBI limits (e.g., ₹500 per Tx, ₹2000 total) | Theoretically unbounded until caught | Strictly bounded: ₹200 per Tx, ₹500 cumulative total |
| **Cryptographic Standard Used** | Proprietary NPCI HSM integration | None / SSL for the scraping tunnel | NIST P-256 (prime256v1) ECDSA-SHA256 signatures |
| **App Store Policy Compliance** | Fully compliant | Frequently violates Accessibility Service policies | Fully compliant (Standard cryptography and APIs) |
| **Data Transmitted Per Transaction** | Full ISO8583 / APDU payloads | Full text SMS / USSD payloads | Compact 84-byte binary payload (single SMS PDU frame) |
| **Settlement Mechanism** | Synchronized upon reconnection | Screen-scraped balance updates | Asynchronous batch upload upon network reconnection |
| **Regulatory Status** | Fully RBI & NPCI sanctioned | Regulatory grey area / Unauthorized | Seeking RBI Sandbox testing authorization |

## Section 3: Risk Disclosure

CryptiLink's architecture is predicated on pragmatic, bounded-risk engineering. The fundamental computer science constraints of a fully disconnected double-spend problem dictate that it cannot be entirely eliminated without a live trusted third party. CryptiLink does not claim impossible perfect security; rather, it bounds the financial risk mathematically. The system enforces a strict ₹500 cumulative offline exposure limit per consumer wallet before a mandatory online refresh is required. Consequently, CryptiLink is exclusively suitable for low-value micro-transactions and daily-use payments, and is not designed for high-value retail.

Additionally, the dual-channel transport mechanisms have inherent environmental dependencies. The acoustic channel, utilized as a tertiary fallback, relies heavily on device speaker/microphone fidelity and is susceptible to severe environmental noise, despite the integration of Reed-Solomon (15,11) forward error correction. The primary offline channel, SMS, requires the consumer to have a functional SIM card with SMS sending capabilities. While these risks are present, they are explicitly managed and transparently disclosed, prioritizing intellectual honesty over misleading claims of infallibility.

## Section 4: Regulatory Pathway

The deployment and regulatory scaling of CryptiLink follows a measured, three-phase trajectory:

*   **Phase A (Current):** Prototype execution. The system is operating in a controlled, sandbox environment on isolated hardware. This phase validates the core cryptographic primitives, the 84-byte payload formatting, and the dual-channel transmission mechanisms without interfacing with live financial ledgers.
*   **Phase B (Regulatory Sandbox):** Submission of a formal application to the RBI Regulatory Sandbox under the Payment and Settlement Systems Act 2007 (specifically targeting the "Retail Payments" cohort). This phase involves heavily monitored field testing with a restricted user base to empirically validate the 3-layer cap enforcement and the offline verification latency targets (sub-200ms) under real-world conditions.
*   **Phase C (Bank SDK Partnership):** Following successful sandbox graduation, CryptiLink will transition from a standalone application to a lightweight, embedded SDK. This SDK will be integrated directly into acquiring banks' existing merchant and consumer applications (e.g., HDFC, Axis). This B2B2C approach eliminates the need for independent consumer app distribution while universally upgrading the existing payment ecosystem to support offline acceptance.
