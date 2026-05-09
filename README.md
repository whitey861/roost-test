# VaultSync

Back up large files from external drives to Wasabi cloud storage.

## Local Dev Setup

1. Copy `.env.example` to `.env` and fill in values
2. `docker-compose up -d` — starts PostgreSQL
3. `cd server && npm install && node db/migrate.js` — runs migrations and seeds admin + demo user
4. `cd server && npm run dev` — starts API on port 3001
5. `cd client && npm install && npm run dev` — starts frontend on port 5173

## Test Accounts

| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@vaultsync.local    | Admin1234! |
| User  | demo@vaultsync.local     | Demo1234!  |

## Switching to Real Wasabi

1. Set `STORAGE_PROVIDER=wasabi` in `.env`
2. Fill in `WASABI_ACCESS_KEY`, `WASABI_SECRET_KEY`, `WASABI_BUCKET`, `WASABI_REGION`
3. See `server/storage/WasabiS3Provider.js` for full instructions

## Deploy to DigitalOcean

1. Push to `main`
2. `doctl apps create --spec app.yaml`
3. Set env vars via DigitalOcean dashboard or `doctl`

## Encryption Notes

- **None:** No encryption, files stored as-is
- **AES-256 Local Key:** Encrypted in-browser before upload using Web Crypto API (AES-GCM). Key never leaves your machine.
- **AES-256 Escrow:** Encrypted in-browser, key stored server-side encrypted with your password. Recoverable by admin.
