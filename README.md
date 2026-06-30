# 🙋‍♀️ The Mom Drop

**The ultimate autonomous deal-finder for modern parents.**

An AI-assisted Amazon deal curation platform — surfacing premium, high-discount deals in luxury beauty, high-end baby gear, and home organization. Fully monetized via the Amazon Associates affiliate program.

---

## Quick Start

```bash
# 1. Copy environment config
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start the server (Express + React SPA + background worker)
npm start
```

The server starts on `http://localhost:3000`. The background worker begins running automatically.

---

## Environment Variables

See [`.env.example`](.env.example) for all configurable variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Public-facing URL (set to `https://mom-drop.com` in production) |
| `DATABASE_PATH` | `/home/team/shared/app.db` | SQLite database file path |
| `DB_PATH` | (fallback) | Alternate name for database path |
| `AMAZON_ASSOCIATE_TAG` | `shopwitshelby-20` | Amazon Associates tracking tag |
| `ENABLE_SMS` | `false` | Enable SMS dispatch (MVP is email-only) |
| `RESEND_API_KEY` | — | Resend API key for transactional email |
| `EMAIL_FROM_NAME` | `The Mom Drop` | Sender display name |
| `EMAIL_FROM_ADDRESS` | `hello@mom-drop.com` | Sender email address |
| `EMAIL_SENDING_ENABLED` | `false` | Safety gate — set `true` only after DNS/email auth |
| `TEST_EMAIL_RECIPIENT` | — | Optional recipient for `scripts/test-email.js` |

---

## Architecture

```
the-mom-drop/
├── backend/
│   ├── server.js          # Express API server (port 3000)
│   ├── database.js        # SQLite schema + seed data
│   ├── email.js           # Resend email provider adapter
│   ├── worker.js          # Background deal simulator + notification dispatcher
│   ├── resilience_monitor.py  # Self-healing daemon
│   ├── logs/              # Notification output (until real email is wired)
│   └── seo-compiled/      # Auto-generated SEO content
├── frontend/
│   └── dist/              # Built React SPA (served by Express)
├── scripts/
│   └── test-email.js      # Safe email config validator + test sender
├── .env.example           # Documented environment variables
├── LAUNCH_CHECKLIST.md    # DNS / email / deployment checklist
└── package.json
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Site configuration values |
| GET | `/api/deals` | Active deals (filterable by category, sort) |
| POST | `/api/subscribe` | Add a subscriber |
| POST | `/api/unsubscribe` | Remove a subscriber |
| GET | `/api/clicks/track?dealId=...` | Track affiliate link click (302 redirect to Amazon) |
| GET | `/api/stats` | Admin dashboard metrics |

---

## Email (Resend)

Transactional emails are powered by [Resend](https://resend.com). The worker sends deal alerts via `backend/email.js`.

**Behavior**:
- If `RESEND_API_KEY` is not set: emails are logged to `backend/logs/notifications.log` (safe default)
- If `RESEND_API_KEY` is set but `EMAIL_SENDING_ENABLED=false`: emails are logged (safety gate)
- If both `RESEND_API_KEY` is set and `EMAIL_SENDING_ENABLED=true`: emails are sent live via Resend

### Quick Test

```bash
# Validate config (no key exposed):
node scripts/test-email.js

# Send a test email (requires RESEND_API_KEY + EMAIL_SENDING_ENABLED=true):
node scripts/test-email.js hello@mom-drop.com
```

---

## Launch

See [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) for the full step-by-step deployment guide, including DNS records, email sender authentication (SPF/DKIM/DMARC), and pre-launch verification.

---

## MVP Limitations

- **Deal scanning**: Currently uses seeded demo deals. Real Amazon Product Advertising API integration is not yet connected.
- **Email sending**: Uses Resend when configured. Falls back to log-only if `RESEND_API_KEY` is not set.
- **SMS**: Disabled by default. Requires owner opt-in and Twilio setup.
- **Channel**: Email-only launch. No SMS or push notifications in the MVP.

---

## License

Built for The Mom Drop. Amazon Associate ID: `shopwitshelby-20`
