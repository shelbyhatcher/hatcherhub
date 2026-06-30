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

---

## Architecture

```
the-mom-drop/
├── backend/
│   ├── server.js          # Express API server (port 3000)
│   ├── database.js        # SQLite schema + seed data
│   ├── worker.js          # Background deal simulator + notification dispatcher
│   ├── resilience_monitor.py  # Self-healing daemon
│   ├── logs/              # Notification output (until real email is wired)
│   └── seo-compiled/      # Auto-generated SEO content
├── frontend/
│   └── dist/              # Built React SPA (served by Express)
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
| GET | `/api/click` | Track affiliate link click (302 redirect to Amazon) |
| GET | `/api/stats` | Admin dashboard metrics |

---

## Launch

See [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) for the full step-by-step deployment guide, including DNS records, email sender authentication (SPF/DKIM/DMARC), and pre-launch verification.

---

## MVP Limitations

- **Deal scanning**: Currently uses seeded demo deals. Real Amazon Product Advertising API integration is not yet connected.
- **Email sending**: Logs to file only. Real SMTP/API sending requires a provider and DNS authentication.
- **SMS**: Disabled by default. Requires owner opt-in and Twilio setup.
- **Channel**: Email-only launch. No SMS or push notifications in the MVP.

---

## License

Built for The Mom Drop. Amazon Associate ID: `shopwitshelby-20`
