# CryptiLink Bank Server & Settlement Engine

This is the Node.js/Express backend for the CryptiLink offline payment protocol. It serves as the ultimate root of trust, handling wallet registration, hardware-backed certificate issuance, and secure asynchronous settlement using strict row-level database locking to enforce double-spend caps.

## Prerequisites

- **Node.js**: v20 or newer
- **Docker**: For running the PostgreSQL database via `docker-compose` (optional if you have a local Postgres instance running).
- **PostgreSQL**: v15 or newer (if not using Docker).

## Environment Variables

Copy `.env.example` to `.env` in this directory:
```bash
cp .env.example .env
```

### Configuration Reference

| Variable | Description |
| --- | --- |
| `PORT` | The port the Express server listens on (default: `3000`). |
| `DATABASE_URL` | The PostgreSQL connection string. |
| `BANK_PRIVATE_KEY_PATH` | Path to the bank's ECDSA private key. Used to sign consumer certificates. |
| `BANK_PUBLIC_KEY_PATH` | Path to the bank's ECDSA public key. |
| `POSTHOG_API_KEY` | Your PostHog API key for tracking events (e.g., `WALLET_REGISTERED`, `TX_SETTLED`). |
| `DASHBOARD_API_KEY` | Shared secret header (`X-Dashboard-Key`) to authorize the React Admin Dashboard to hit the analytics summary endpoints. |

*(Note: Security caps like `MAX_OFFLINE_TX_AMOUNT` (₹200) and `MAX_OFFLINE_CUMULATIVE` (₹500) are hardcoded in `src/config/index.ts` intentionally, to prevent environment tampering.)*

## Quick Start

1. **Start the database:**
   ```bash
   docker-compose up -d postgres
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run database migrations:**
   Applies the schema (wallets, certificates, escrow_ledger, wallet_exposure, settlement_batches, settled_transactions).
   ```bash
   npm run db:migrate
   ```
4. **Generate the Bank Keypair:**
   If this is your first run, you must generate the ECDSA prime256v1 (P-256) master keys. The server cannot issue certificates without them.
   ```bash
   npx ts-node scripts/generate-bank-keys.ts
   ```
5. **Start the server:**
   ```bash
   npm run dev
   ```

*(To run the integration test suite, execute `npm run test` while the database is running).*

## Core API Endpoints

### 1. Register a Wallet
Registers a consumer's ECDSA public key.
```bash
curl -X POST http://localhost:3000/api/v1/wallet/register \
  -H "Content-Type: application/json" \
  -d '{"public_key": "<base64 SPKI DER public key>"}'
```

### 2. Load Funds / Issue Certificate
Debits the liquid account and issues an offline signed certificate valid up to ₹500 cumulative exposure.
```bash
curl -X POST http://localhost:3000/api/v1/wallet/CL-VAULT-1234/load \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}'
```

### 3. Settle a Batch
Accepts an encrypted offline transaction batch from a merchant, validates all signatures and sequences, and updates exposure using row-level locking.
```bash
curl -X POST http://localhost:3000/api/v1/settle \
  -H "Content-Type: application/json" \
  -d '{
        "merchant_id": "MERCH-01",
        "transactions": [
          {
            "wallet_id": "CL-VAULT-1234",
            "amount": 150,
            "sequence_counter": 1,
            "timestamp": 1718800000,
            "signature": "<base64 ECDSA signature>"
          }
        ]
      }'
```

## Analytics Endpoints

The server exposes internal endpoints for the CryptiLink Dashboard. All require the `X-Dashboard-Key` header.

### 4. System Summary
```bash
curl -H "X-Dashboard-Key: your_dashboard_secret_key" http://localhost:3000/api/v1/analytics/summary
```

### 5. Recent Transactions
```bash
curl -H "X-Dashboard-Key: your_dashboard_secret_key" http://localhost:3000/api/v1/analytics/recent-transactions?limit=20
```

### 6. Channel Statistics
```bash
curl -H "X-Dashboard-Key: your_dashboard_secret_key" http://localhost:3000/api/v1/analytics/channel-stats
```
