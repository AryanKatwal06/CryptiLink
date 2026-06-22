# CryptiLink Phase 4 — Manual Test Checklist

Because the Phase 4 merchant application relies heavily on device-specific hardware (microphone, vibration motor, SMS receivers) and visual differentiation (Skia animations), these critical flows MUST be tested on physical hardware.

## Pre-requisites
- [ ] 2 Physical Android devices (1 Consumer, 1 Merchant)
- [ ] Local bank server running (`npm run dev`)
- [ ] Both devices connected to the same local network (for bank server access)

## 1. SMS Receiving Flow
1. **Setup**: On Merchant device, open the app, go to "Start Listening".
2. **Action**: On Consumer device, use the Phase 3 stub to send an SMS transaction payload to the Merchant device's phone number.
3. **Verify**:
   - [ ] Merchant device detects incoming SMS (light tap haptic).
   - [ ] Verification screen opens automatically.
   - [ ] The 4 checks stamp in sequentially.
   - [ ] Screen shows **Amber "Pending Settlement"** banner.
   - [ ] **Medium haptic** (100ms) plays on success.

## 2. Acoustic Receiving Flow
1. **Setup**: On Merchant device, go to "Start Listening" and tap the Acoustic channel toggle to enable the microphone.
2. **Action**: On Consumer device, play the Phase 3 FSK-encoded Goertzel audio payload from the device speaker, holding it ~10cm from the Merchant device microphone.
3. **Verify**:
   - [ ] Merchant device UI updates to "Signal detected — receiving..."
   - [ ] Verification screen opens automatically once payload is decoded.
   - [ ] Screen shows **Amber "Pending Settlement"** banner.

## 3. The `OFFLINE_VERIFIED` vs `SETTLED` Distinction (Critical)
This tests the core security requirement to prevent the liability gap.

1. **Setup**: Merchant device has 1 offline-verified transaction from the steps above. Turn OFF WiFi/Cellular on the Merchant device.
2. **Action**: Go to Dashboard -> Transaction History.
3. **Verify (Offline)**:
   - [ ] Transaction shows an **Amber** badge with a clock icon.
   - [ ] Dashboard shows total amount in the Amber "Pending Settlement" card.
   - [ ] **NO green checkmarks anywhere**.
4. **Action**: Turn ON WiFi/Cellular on the Merchant device. Trigger settlement (app foreground/background or manual refresh).
5. **Verify (Online/Settled)**:
   - [ ] Heavy+Double haptic plays (the "you got paid" feeling).
   - [ ] Transaction history updates to a **Green** badge with a checkmark.
   - [ ] Dashboard moves the amount to the Green "Settled" card.

## 4. Rejection Handling
1. **Setup**: Use the dual-merchant setup to create a double-spend. Merchant A settles successfully.
2. **Action**: Merchant B connects to WiFi and settles.
3. **Verify**:
   - [ ] 3 sharp haptic pulses play (failure).
   - [ ] Transaction history shows a **Red** badge with "Exceeded cumulative offline spending cap".
   - [ ] Dashboard moves the amount to the Red "Rejected" card.
   - [ ] The rejected transaction is prominently visible and not silently discarded.
