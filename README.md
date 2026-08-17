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

## What is in this build

- Landing, pricing stub, terms/privacy stubs
- Sign up, login, email verification, password reset
- Settings: profile, email change, password, sessions, account deletion
- Admin: create users, roles, ban, password reset, session revoke, impersonate
- Connection settings for GunBroker, with ShipStation and WooCommerce stubs
- Inventory and sold pages reserved for the next parts

Users always have one GunBroker connection. Sandbox vs live is a deployment setting (`GUNBROKER_ENVIRONMENT` in `.env`), not a product choice. Local development uses sandbox; production uses the live API. Seller username and password are saved per Chamber account and encrypted at rest.

## Stack

Next.js, better-auth, Prisma/SQLite (swap `DATABASE_URL` to Postgres later), Tailwind.
