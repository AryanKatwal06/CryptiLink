# Razorpay Test Mode - Payment Test Data

Use only in development and staging.

## Test Cards
- Success: 4111 1111 1111 1111 | Any future expiry | CVV: any 3 digits | OTP: 1234
- Failure: 4000 0000 0000 0002

## Test UPI
- Success: success@razorpay
- Failure: failure@razorpay

## Test Net Banking
- Any bank visible in Razorpay sandbox.
- Credentials: any value.

## Reminder
- Never test with real cards or real UPI IDs in dev.
- Never store live keys in this repository.
- This phase does not use Razorpay webhooks.
