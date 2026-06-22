# CryptiLink Bank Server — Phase 1

> Mock bank server and cryptographic foundation for the CryptiLink offline payment protocol.

## What This Is

CryptiLink lets a consumer pre-load money into an offline "vault" on their phone, backed by a bank-signed ECDSA certificate. This server handles:

- **Wallet registration** — consumers register their ECDSA public key
- **Certificate issuance** — bank signs a certificate authorizing offline spending
- **Settlement** — merchants submit batches of offline transactions for verification
- **Double-spend protection** — cumulative exposure caps enforced at settlement time

## Prerequisites

- **Node.js** v20+
- **PostgreSQL** 15+ (Docker recommended, or Neon free tier)
- **npm** v9+

## Quick Start

### 1. Clone & Install

```bash
cd cryptilink-bank-server
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your database connection string if needed
```

### 3. Start PostgreSQL (Docker)

From the project root:

```bash
docker-compose up -d postgres
```

Then create the `cryptilink` database:

```bash
docker exec -it $(docker ps -q -f ancestor=postgres:15) psql -U postgres -c "CREATE DATABASE cryptilink;"
```

### 4. Run Migrations & Seed

```bash
npm run migrate
npm run seed
```

### 5. Generate Bank Keys

```bash
npm run generate-keys
```

This creates an ECDSA prime256v1 keypair in `./keys/`.

### 6. Start the Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`.

### 7. Run the Demo

In a second terminal:

```bash
npm run demo
```

This walks through the full happy path: register → load → settle (with cap enforcement).

### 8. Run Tests

```bash
npm test
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/bank/public-key` | Fetch the bank's ECDSA public key |
| `POST` | `/api/v1/wallet/register` | Register a new wallet with consumer's public key |
| `POST` | `/api/v1/wallet/:walletId/load` | Pre-load funds and receive a signed certificate |
| `POST` | `/api/v1/settle` | Submit a settlement batch from a merchant |

## Security Caps

These are **hardcoded** (not configurable via env) to prevent tampering:

| Cap | Value | Purpose |
|-----|-------|---------|
| `MAX_OFFLINE_TX_AMOUNT` | ₹200 | Maximum per single offline transaction |
| `MAX_OFFLINE_CUMULATIVE` | ₹500 | Maximum total exposure before certificate refresh |

## Architecture

```
src/
├── config/          # Environment + security constants
├── crypto/          # ECDSA keys, signing, compact payload codec
├── db/              # PostgreSQL pool + migrations
├── routes/          # Express route handlers
├── services/        # Business logic (wallet, certificate, settlement)
│   └── settlement/  # Isolated settlement engine (extractable)
└── types/           # TypeScript type definitions + specs
```

## Environment Variables

See [.env.example](.env.example) for the full list.

## Cryptographic Notes

- **Curve**: `prime256v1` (OpenSSL) = `secp256r1` (NIST) = `P-256` (WebCrypto)
- **Signing**: ECDSA-SHA256 over canonical JSON (sorted keys, no whitespace)
- **Compact payload**: 84 bytes with raw (r‖s) signature format for SMS transport
