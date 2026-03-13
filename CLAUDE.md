# HMO Event Platform — CLAUDE.md

## Project Overview

Browser-based ticketing platform for live music events. Handles OTP auth, event discovery, Razorpay payments, QR-based venue entry, and an admin console. All user-facing and admin flows run in the browser via Next.js — no native app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| User Web App | Next.js (App Router) — **this repo** |
| Admin Console | Next.js (App Router) — **same repo, `/admin` routes** |
| API | Node.js / Express REST (`api/` directory) |
| Database | PostgreSQL + Drizzle ORM |
| OTP / Email | Resend |
| Payments | Razorpay |
| Messaging | WhatsApp Business API (Meta) |
| QR Codes | `qrcode` npm (server-side, HMAC-signed) |
| Deployment | Vercel (web) · Railway/Render (API) · Supabase/Neon (DB) |

---

## Repository Structure

```
hmo-app-new/
  app/
    (auth)/          # Login, OTP, complete-profile pages
    (user)/          # Event listing, ticket purchase, QR display
    (admin)/         # Admin console pages
    api/             # Next.js API route proxies → Express
  api/
    src/
      routes/        # Express route handlers
      services/      # mailer, otp, redis
      middleware/    # JWT auth
  lib/
    db/              # Drizzle schema + client
  infra/
    migrations/      # SQL migration files
  public/            # Static assets (images, fonts)
```

---

## Database Schema (Source of Truth)

### users
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR(150) UNIQUE NOT NULL | Primary identifier — used for OTP auth |
| name | VARCHAR(100) NULL | |
| phone_number | VARCHAR(20) NULL | Optional, collected at profile completion |
| ig_handle | VARCHAR(80) NULL | |
| date_of_birth | DATE NULL | |
| is_admin | BOOLEAN DEFAULT false | **DB-only — no UI endpoint** |
| created_at | TIMESTAMP NOT NULL | |

### events
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| title | VARCHAR(200) NOT NULL | |
| description | TEXT | |
| event_date | TIMESTAMP NOT NULL | |
| venue | VARCHAR(200) | |
| background_image_url | TEXT | Hero card visual |
| youtube_url | TEXT | Past events only |
| razorpay_item_id | VARCHAR(100) | |
| ticket_price | INTEGER NOT NULL | **In paise (INR × 100)** |
| is_ticketing_closed | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMP NOT NULL | |

### event_allowlist
| Field | Type | Notes |
|---|---|---|
| event_id | UUID FK → events | Composite PK |
| user_id | UUID FK → users | Composite PK |

### tickets
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | Also the Ticket ID |
| event_id | UUID FK NOT NULL | |
| user_id | UUID FK NOT NULL | |
| booking_status | ENUM NOT NULL | `confirmed` · `pending` · `cancelled` |
| payment_mode | ENUM NOT NULL | `razorpay` · `cash_div` · `cash_ted` |
| razorpay_order_id | VARCHAR(100) | |
| razorpay_payment_id | VARCHAR(100) | |
| qr_code_token | VARCHAR(255) UNIQUE | Signed JWT / UUID |
| entry_status | ENUM DEFAULT `not_entered` | `not_entered` · `admitted` |
| created_at | TIMESTAMP NOT NULL | |

### waitlist
| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| event_id | UUID FK NULL | NULL = general waitlist |
| name | VARCHAR(100) NOT NULL | |
| phone_number | VARCHAR(20) NOT NULL | |
| ig_handle | VARCHAR(80) | |
| added_to_event | BOOLEAN DEFAULT false | Flipped on admin promote |
| created_at | TIMESTAMP NOT NULL | |

---

## API Endpoints Reference

### Auth
```
POST /auth/send-otp          # email → OTP via Resend (rate-limited: 3/email/10min)
POST /auth/verify-otp        # OTP → JWT + is_new_user flag (OTP stored in Redis, 5min TTL)
POST /auth/complete-profile  # Save name + phone + dob (new users, JWT required)
```

### Events
```
GET   /events                # All events with is_allowed + is_ticketing_closed per user
GET   /events/:id            # Single event detail
POST  /events                # [Admin] Create event
PATCH /events/:id/close-ticketing  # [Admin] Close ticket sales
```

### Tickets & Payments
```
POST /tickets/create-order   # Create Razorpay order → return order_id
POST /tickets/confirm        # Verify HMAC sig → create ticket → generate QR → send WhatsApp
POST /webhooks/razorpay      # Razorpay webhook (backup confirmation path)
GET  /tickets/:id/qr         # QR PNG (owner or admin only)
POST /tickets/:id/admit      # [Admin] Mark entry_status = admitted
```

### Admin
```
GET  /admin/events/:id/attendees        # List with search + sort
POST /admin/events/:id/attendees        # Manually add attendee (cash payment)
GET  /admin/events/:id/attendees/export # CSV download
GET  /admin/events/:id/waitlist         # View waitlist
POST /admin/waitlist/:id/promote        # Move to event allowlist
```

### Waitlist (Public — no auth)
```
POST /waitlist  # name + phone + ig_handle → upsert user + waitlist entry
```

---

## Environment Variables

```bash
DATABASE_URL                # PostgreSQL full connection string
JWT_SECRET                  # Min 32 chars random string
RESEND_API_KEY              # Resend dashboard → API Keys
EMAIL_FROM                  # Sender address (e.g. onboarding@resend.dev for testing)
REDIS_HOST                  # Redis host (default: 127.0.0.1)
REDIS_PORT                  # Redis port (default: 6379)
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET         # Used for HMAC signature verification
RAZORPAY_WEBHOOK_SECRET     # Webhook signature validation
WHATSAPP_TOKEN              # WhatsApp Business API token
WHATSAPP_PHONE_NUMBER_ID    # Meta Cloud API phone number ID
QR_HMAC_SECRET              # Signs QR token payload
NEXT_PUBLIC_API_URL         # Base URL of Express API (e.g. http://localhost:4000)
PORT                        # API server port (default: 4000)
CORS_ORIGIN                 # Allowed origin for CORS (e.g. http://localhost:3000)
```

---

## Implementation Modules (Build in Order)

### Module 1 — Scaffolding & Database ✅ Done
- Next.js app + Express API in same repo, PostgreSQL via Drizzle ORM
- Migrations in `infra/migrations/`

### Module 2 — Authentication API ✅ Done
- `POST /auth/send-otp` and `POST /auth/verify-otp` using Resend (email OTP)
- OTP stored in Redis with 5-minute TTL; deleted on successful verify
- JWT middleware (`{ user_id, is_admin }` payload, 30-day expiry)
- Rate-limit send-OTP to **3 requests per email per 10 minutes** (Redis counter)

### Module 3 — Browser Auth Screens ✅ Done
- Splash → Login (email + OTP expand animation) → Complete Profile
- JWT stored in httpOnly cookie (`hmo_jwt`) set by Next.js proxy on verify
- New users redirected to `/complete-profile`; returning users to `/events`

### Module 4 — Events API + Home Screen
- `GET /events` with per-user `is_allowed` + `is_ticketing_closed` flags
- Home screen CTA logic: **Sold Out** / **Buy Ticket** / **Join Waitlist**
- Browser page at `/events`

### Module 5 — Ticket Purchase Flow
- Razorpay checkout embedded in browser (Razorpay.js)
- Always create Razorpay orders **server-side** — never trust client amount
- Verify HMAC before writing ticket: `HMAC-SHA256(order_id + '|' + payment_id, key_secret)`
- Confirmation page at `/tickets/:id`

### Module 6 — QR Generation & WhatsApp
- QR token = HMAC-signed `{ ticket_id, event_id, user_id, issued_at }`
- `GET /tickets/:id/qr` returns PNG (auth-gated); displayed in browser at `/tickets/:id`
- WhatsApp: pre-approved Meta template with image header (QR code)

### Module 7 — Admin Console
- OTP login + `is_admin` check via Next.js middleware
- Attendee table: TanStack Table, search/sort, CSV export
- QR scanner: `react-qr-reader` (requires HTTPS) → `POST /tickets/:id/admit`

### Module 8 — Waitlist + Polish
- Public `/waitlist` route (no auth, shareable URL)
- Rate-limit waitlist endpoint
- Admin promote: one-click from waitlist → event allowlist

---

## Critical Rules & Gotchas

### Security
- `is_admin` is **only set via raw SQL on the DB** — never add a UI endpoint for this
- `event_allowlist` rows are the **sole source of truth** for ticket purchase eligibility
- Store OTPs in Redis with 5-minute TTL server-side — never in JWT claims
- Razorpay: always verify HMAC signature before persisting any ticket record
- QR admission: check `entry_status === 'not_entered'` before marking admitted (prevent double-entry)
- `/waitlist` must remain fully public — no auth required

### Resend / OTP
- OTP is a 6-digit random number, generated server-side via `crypto.randomInt`
- Stored in Redis as `otp:{email}` with 5-minute TTL; deleted immediately after successful verify
- Rate limit key: `otp_rl:{email}`, max 3 sends per 10-minute window
- `EMAIL_FROM=onboarding@resend.dev` works for testing; switch to a verified domain for production

### Browser / Mobile Web
- Design for mobile viewport first (375px wide baseline)
- Minimum touch targets: **44×44px** on interactive elements
- Use `min-h-dvh` (not `min-h-screen`) to handle mobile browser chrome correctly
- Test on real phone via local IP (`npm run dev -- -H 0.0.0.0`) — browser DevTools doesn't reproduce mobile keyboard behaviour accurately

### Payments
- Create Razorpay orders server-side — **never trust the amount from the client**
- Implement both `POST /tickets/confirm` and `POST /webhooks/razorpay` (webhook is fallback)
- `ticket_price` is stored in **paise** (INR × 100)

### Admin / QR Scanner
- `react-qr-reader` requires **HTTPS** in production (Vercel handles this)
- Return clear errors for expired, invalid, or already-used QR tokens

### WhatsApp
- Meta Cloud API requires a **pre-approved message template** for first contact
- Fallback: send QR as media message if user has messaged you first

---

## Resend Integration Snippet

```typescript
import { Resend } from 'resend';
import crypto from 'crypto';
import redis from './redis';

const resend = new Resend(process.env.RESEND_API_KEY!);

// Send OTP
const otp = crypto.randomInt(100000, 1000000).toString();
await redis.set(`otp:${email}`, otp, 'EX', 300); // 5-min TTL
await resend.emails.send({
  from: process.env.EMAIL_FROM!,
  to: email,
  subject: 'Your HMO login code',
  text: `Your code is ${otp}. Valid for 5 minutes.`,
});

// Verify OTP
const stored = await redis.get(`otp:${email}`);
if (!stored || stored !== otp) throw new Error('Invalid OTP');
await redis.del(`otp:${email}`);
```

## Razorpay HMAC Verification

```typescript
import crypto from 'crypto';

const body = razorpay_order_id + '|' + razorpay_payment_id;
const expected = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(body)
  .digest('hex');

if (expected !== razorpay_signature) throw new Error('Invalid payment signature');
```

## QR Token Design

```typescript
// Generate
const token = jwt.sign(
  { ticket_id, event_id, user_id, issued_at: Date.now() },
  process.env.QR_HMAC_SECRET,
  { expiresIn: '30d' }
);

// Verify at admission
const payload = jwt.verify(token, process.env.QR_HMAC_SECRET);
// Then: check DB that ticket exists + entry_status === 'not_entered'
```

---

## Current Status

Stack: Next.js 16.1.6 · React 19 · TypeScript · Tailwind CSS v4 · Express API · Drizzle ORM · Redis · Resend.

**What's built:**
- Auth screens: Splash (`/`), Login (`/login`, email + OTP expand animation), Complete Profile (`/complete-profile`)
- Auth API: `POST /auth/send-otp` + `POST /auth/verify-otp` + `POST /auth/complete-profile` (Resend + Redis, rate-limited)
- DB schema: Drizzle ORM schema in `lib/db/schema.ts`, migrations applied in `infra/migrations/`
- Express API scaffold: all route files exist (`auth`, `profile`, `tickets`, `admin`, `webhooks`)

**Running locally:**
```bash
# Terminal 1 — API (port 4000)
cd api && npm run dev

# Terminal 2 — Next.js (port 3000)
npm run dev
```
Redis must be running locally (`redis-server`).


## Active Sprint

Enhancements to the platform

I want to do away with the concept of users having to join a waitlist before they can buy a ticket, which basically means that all users who login with an email will see "Buy Ticket". I dont want to abandon the waitlist, I just want to automatically add a user to the event_allowlist as soon as they login et all users with ticket_price to 1750 by default.Skip the email that is sent when a user is promoted. They should be able to book and get confirmation email with QR. I will want to undo this so let's make this a config at an event level. Inside each event, there should be a config to enable and disable waitlisting.