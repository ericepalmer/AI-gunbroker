# Chamber

Operations software for GunBroker sellers — especially ammo, also firearms. Pull listings, update dates/prices/quantities, rebuild ended auctions, and send sold orders to ShipStation.

This repo currently ships the marketing site, accounts, and GunBroker connection settings. Inventory sync and shipping are next.

## Run locally

You need Node 20.9 or newer.

```bash
cp .env.example .env
# set BETTER_AUTH_SECRET (openssl rand -base64 32)
# optionally change ADMIN_EMAIL / ADMIN_PASSWORD

npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default admin after seed:

- Email: `admin@example.com` (or whatever you set in `.env`)
- Password: `change-me-now`

Sign-up requires email verification. In development, messages are stored at `/dev/inbox` and printed in the terminal. Set `RESEND_API_KEY` when you want real mail.

## Deploy on DigitalOcean (Droplet + Docker)

The app uses **SQLite**. Deploy on a single Droplet. The database file is `data/chamber.db` on the server (bind-mounted to `/data` in the container). Do not scale to multiple instances until you migrate to Postgres.

To bring the database you already have (users, listings, sold orders, saved connections):

```bash
mkdir -p data
sqlite3 prisma/dev.db ".backup 'data/chamber.db'"
```

Copy `data/chamber.db` to the Droplet with the app. Use the same `BETTER_AUTH_SECRET` as the `.env` that created that file. A different secret leaves the encrypted GunBroker, ShipStation, and WooCommerce passwords unreadable. Leave `SEED_ON_START=false`.

### 1. Droplet

- Ubuntu 24.04, 1 vCPU / 1GB+ RAM is enough to start
- Install Docker: https://docs.docker.com/engine/install/ubuntu/
- Open ports **22**, and either **3000** (HTTP) or **80/443** (Caddy TLS)
- Point a DNS A record at the Droplet if you want HTTPS

### 2. App on the server

```bash
git clone https://github.com/ericepalmer/AI-gunbroker.git
cd AI-gunbroker
cp .env.production.example .env.production
# edit .env.production — at minimum:
#   BETTER_AUTH_SECRET, BETTER_AUTH_URL, RESEND_API_KEY, EMAIL_FROM
#   GUNBROKER_ENVIRONMENT=production, GUNBROKER_PRODUCTION_DEVKEY
#   ADMIN_* and SEED_ON_START=true for the first boot only
```

Set `BETTER_AUTH_URL` (and `NEXT_PUBLIC_APP_URL`) to the public origin users will open, e.g. `https://chamber.example.com` — no trailing slash.

### 3. Start

HTTP on port 3000:

```bash
docker compose up -d --build
```

HTTPS with Caddy (automatic certificates):

```bash
# DOMAIN must be set in .env.production and DNS must already point here
APP_PUBLISH_PORT=127.0.0.1:3000 docker compose --profile tls up -d --build
```

After the first successful seed, set `SEED_ON_START=false` in `.env.production` and recreate the app container so you do not re-seed on every restart:

```bash
docker compose up -d
```

One-off seed later:

```bash
docker compose exec app npx prisma db seed
```

### 4. Updates

```bash
git pull
docker compose up -d --build
# migrate deploy runs automatically on container start
```

SQLite data lives in `data/chamber.db` next to the app. Back it up before risky changes:

```bash
sqlite3 data/chamber.db ".backup 'chamber-db-backup.db'"
```

### App Platform note

`.do/app.yaml` is a Dockerfile-oriented skeleton for DigitalOcean App Platform. Prefer the Droplet path above while the database is SQLite — App Platform filesystems are ephemeral unless you add durable storage or switch to managed Postgres.

## What is in this build

- Landing, pricing stub, terms/privacy stubs
- Sign up, login, email verification, password reset
- Settings: profile, email change, password, sessions, account deletion
- Admin: create users, roles, ban, password reset, session revoke, impersonate
- Connection settings for GunBroker, with ShipStation and WooCommerce stubs
- Inventory and sold pages reserved for the next parts

Users always have one GunBroker connection. Sandbox vs live is a deployment setting (`GUNBROKER_ENVIRONMENT` in `.env`), not a product choice. Local development uses sandbox; production uses the live API. Seller username and password are saved per Chamber account and encrypted at rest.

## Stack

Next.js, better-auth, Prisma/SQLite (swap `DATABASE_URL` to Postgres later), Tailwind, Docker for DigitalOcean Droplets.
