# CryptiLink Pitch Deck Outline

## Slide 1: The Problem — The Synchronous Fragility

**Slide Visuals:**
*   A diagram showing the 5-node TCP/IP dependency chain: Consumer Device → PSP Gateway → NPCI Switch → Remitter Bank CBS → Beneficiary Bank CBS.
*   A red "X" breaking the chain at the first node, with a caption: "A single packet drop equals a lost sale."
*   High-contrast metric: "40% of Indian Android devices lack NFC hardware."

**Speaker Notes:**
"It is 6:47 PM on a Saturday at Chandni Chowk market. Three hundred thousand people are moving through a 500-meter radius. The cellular network is completely saturated. A customer tries to pay ₹180 for dinner using standard UPI. The payment spins for eight seconds, times out, and fails. The merchant loses the sale. This happens forty to sixty times every Saturday for that single merchant.

The root cause is structural: modern digital payments require a synchronous, real-time network handshake across five different banking and switching nodes. A latency spike anywhere in that chain breaks the transaction. Existing offline solutions like UPI Lite X attempt to solve this, but they rely strictly on NFC hardware. That excludes forty percent of the Android devices actively used in emerging markets today, and requires merchants to throw away their cheap, printed paper QR codes for expensive electronic terminals. The infrastructure barrier is simply too high."

---

## Slide 2: The Solution — CryptiLink Offline Protocol

**Slide Visuals:**
*   A 3-step visual flow: 1. Camera scanning paper QR → 2. Audio/SMS wave animation → 3. Merchant phone showing green "VERIFIED" checkmark.
*   "Hardware Independent. Zero Network Required."

**Speaker Notes:**
"CryptiLink solves this by removing both the network requirement and the NFC hardware requirement. The flow works in exactly six steps. 

First, the consumer opens the app and scans the merchant's existing printed paper QR code—no new hardware required. Second, they enter the amount. Third, the consumer authenticates biometrically, and their phone's secure hardware enclave generates an ECDSA cryptographic signature for that specific transaction. 

Fourth, the app transmits this signed token via one of two zero-data fallback channels: a silent binary SMS over the robust GSM voice network, or an ultrasonic audio pulse if there is zero cellular signal. Fifth, the merchant's phone receives the payload and performs full offline cryptographic verification in under two hundred milliseconds. Sixth, the transaction is marked as 'Offline Verified', and the merchant hands over the goods. The merchant's app later uploads the batch to the bank asynchronously when they get back online."

---

## Slide 3: Security and Bounded Risk Architecture

**Slide Visuals:**
*   A simplified compliance table highlighting CryptiLink vs. UPI Lite X (emphasizing Paper QR compatibility and Standard Smartphone hardware).
*   A 3-layer diagram: Device Pre-Check → Merchant Sequence Verifier → Bank Row-Locked Settlement.
*   Clear text callout: "Maximum Offline Exposure: ₹500"

**Speaker Notes:**
"You cannot solve the offline double-spend problem perfectly without a live trusted third party. Anyone who says otherwise is selling snake oil. We don't pretend to solve it; we mathematically bound the risk. 

We restrict offline exposure to a strict ₹200 per-transaction cap and a ₹500 cumulative limit. We enforce these limits through a three-layer architecture. First, the consumer device refuses to generate a signature if the cap is breached. Second, the merchant's offline verifier tracks sequences and blocks duplicate or over-limit payloads. Third, the bank's settlement engine uses strict row-level database locking to enforce the final limit, preventing concurrent batch attacks. 

We know the unsolved problems in this space better than our competitors, and we've designed bounded-risk mitigations rather than pretending the problems don't exist. This is built for high-frequency micro-transactions, not high-value retail."

---

## Slide 4: Regulatory Pathway and Ask

**Slide Visuals:**
*   Timeline graphic: Phase A (Sandbox Prototype) → Phase B (RBI Regulatory Sandbox) → Phase C (Bank Embedded SDK).
*   Metrics targets: "99.5% Offline Verification Accuracy", "Zero Double-Spends > ₹500", "Sub-200ms Latency".

**Speaker Notes:**
"We are currently in Phase A: a functional, mathematically sound prototype operating on isolated hardware. Our immediate next step is Phase B: formal testing.

Our specific ask today is authorization to enter the RBI Regulatory Sandbox under the Retail Payments cohort. We have defined strict, measurable success criteria for this trial: we target 99.5% verification accuracy, sub-200 millisecond verification latency at the 95th percentile, and absolute zero successful double-spends exceeding the ₹500 cap at the settlement layer. 

Our ultimate exit strategy is Phase C: packaging CryptiLink not as a standalone consumer app, but as a lightweight SDK. Acquiring banks can embed this SDK directly into their existing merchant and consumer applications, upgrading the entire nation's payment ecosystem to support offline acceptance overnight, with zero new hardware deployed."
