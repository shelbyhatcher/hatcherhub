# 🚀 The Mom Drop — Launch Checklist

> **Owner-selected domain**: `mom-drop.com` (purchased through **GoDaddy**)
> **Sender identity**: `The Mom Drop` <hello@mom-drop.com>
> **Launch channel**: Email-only (SMS disabled by default)

---

## ✅ Phase 1: DNS & Website Routing

These DNS records must be set in the **GoDaddy DNS manager** (GoDaddy Dashboard → Domains → `mom-drop.com` → DNS Records) **before** the site goes live. Use the exact record type(s) your hosting provider gives you — most providers supply either an **A record** (pointing to an IP) or a **CNAME/ALIAS** (pointing to a hostname), but not both for the root domain.

| Record Type | Name | Value | Purpose |
|-------------|------|-------|---------|
| **A** (or CNAME/ALIAS) | `@` | As provided by your host | Root domain → your hosting server |
| **CNAME** | `www` | `mom-drop.com` | Optional: www redirect to root |

> ⚠️ **Do not create both an A and a CNAME for `@`** — conflicting root records will break DNS resolution. Follow your hosting provider's exact instructions.

**Deployment env vars to set:**

```bash
PUBLIC_BASE_URL=https://mom-drop.com
PORT=3000
NODE_ENV=production
```

---

## ✅ Phase 2: Email Sender Authentication

Real outbound email is **not yet active** — the app currently logs notifications to `backend/logs/notifications.log` and does not perform live SMTP sending. Follow this checklist to enable it.

### 2a — Choose an Email Provider

Recommended options for the MVP:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **SendGrid** | 100 emails/day | Most common, simple API |
| **Resend** | 3,000 emails/month | Developer-friendly, modern |
| **Amazon SES** | 62,000 emails/month | Good if already on AWS |

### 2b — Add DNS Records (SPF / DKIM / DMARC)

Once you pick a provider, add these DNS records in the **GoDaddy DNS manager** (same location as Phase 1):

```dns
; SPF — authorize your provider to send on your behalf
TXT  @  "v=spf1 include:<provider-spf> ~all"

; DKIM — sign emails cryptographically (provider gives you the key)
TXT  <dkim-selector>._domainkey  "<provider-dkim-key>"

; DMARC — tell receivers what to do with unauthenticated email
TXT  _dmarc  "v=DMARC1; p=quarantine; rua=mailto:hello@mom-drop.com"
```

> **Important**: DNS propagation can take 1–48 hours. Verify with `dig TXT mom-drop.com` or [MXToolbox](https://mxtoolbox.com) before enabling sending. In GoDaddy, you can also use their built-in DNS propagation checker.

### 2c — Add Email Sending Code

The worker (`backend/worker.js`) currently only logs notifications to `backend/logs/notifications.log`. Before production sending:

1. Install your provider's SDK (e.g., `npm install @sendgrid/mail`)
2. Set `SENDGRID_API_KEY` (or equivalent) in the environment
3. Replace the `logNotification()` calls inside the `dispatchAlerts()` function (around line 380 in `worker.js`) with real provider API calls
4. The sender should be: **The Mom Drop** <hello@mom-drop.com>

---

## ✅ Phase 3: Application Configuration

### Required Env Vars

```bash
# File: .env (copy from .env.example, never commit .env)
PORT=3000
NODE_ENV=production
PUBLIC_BASE_URL=https://mom-drop.com
# DATABASE_PATH=/home/team/shared/app.db    # Optional, default is writable
# DB_PATH=/home/team/shared/app.db           # Alternate name
AMAZON_ASSOCIATE_TAG=shopwitshelby-20
ENABLE_SMS=false                             # Must be false for MVP launch
```

### Verify the app starts correctly

```bash
npm start
# Expected: "The Mom Drop server is listening at http://0.0.0.0:3000"
# Expected: "Database initialization complete."
# Expected: "[WORKER CONFIG] ..." log lines
```

### Verify the app responds

```bash
curl http://localhost:3000/api/config
# → {"success":true,"config":{...}}

curl http://localhost:3000/api/deals
# → {"success":true,"count":3,"deals":[...]}
```

---

## ✅ Phase 4: Pre-Launch Verification

- [ ] Domain `mom-drop.com` resolves to the server IP
- [ ] HTTPS certificate is active (Let's Encrypt via your hosting provider)
- [ ] `curl https://mom-drop.com/api/config` returns valid JSON
- [ ] The frontend SPA loads at `https://mom-drop.com`
- [ ] Affiliate links in `/api/deals` use `tag=shopwitshelby-20`
- [ ] Email provider account is created
- [ ] SPF / DKIM / DMARC DNS records are verified
- [ ] Email sending code in worker.js is updated (see Phase 2c)
- [ ] A test email was sent to the owner and confirmed delivered
- [ ] Unsubscribe link works in the test email
- [ ] `.env` file exists on the server (copy from `.env.example`)
- [ ] `ENABLE_SMS=false` (unless explicitly enabled by the owner)

---

## ⚠️ Known Limitations (MVP)

| Limitation | Details |
|------------|---------|
| **Deal scanning** | Currently seeded dummy deals. Real Amazon PAAPI integration not yet connected. |
| **Email sending** | Logs only. No real SMTP until Phase 2 is complete. |
| **SMS** | Disabled by default. Requires owner opt-in and Twilio setup. |
| **Background worker** | Runs in-process on server start. For production, consider running as a separate PM2 process or cron job. |
| **Database** | Uses SQLite (single-file). For multi-server scaling, migrate to PostgreSQL. |

---

## 📋 Owner Actions Still Needed

1. ✅ **Confirm** `mom-drop.com` is purchased through GoDaddy (confirmed by owner)
2. ⬜ **Choose** an email sending provider (SendGrid, Resend, or Amazon SES)
3. ⬜ **Provide** email provider API keys (store securely, not in chat)
4. ⬜ **Provide** Amazon Product Advertising API credentials (for real deal scanning, later)
5. ⬜ **Set** DNS records in the GoDaddy DNS manager (A/CNAME for website routing, TXT for email auth)
6. ⬜ **Review** the live site and give feedback

---

## 🔍 Verification Commands (Run on Server)

```bash
# Check the app is running
ss -Htln | grep :3000

# Test API health
curl -s https://mom-drop.com/api/stats | python3 -m json.tool

# Check notification log (email actions are recorded here until real sending is wired)
tail -20 backend/logs/notifications.log

# Verify deals and stats are accessible
curl -s https://mom-drop.com/api/deals | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'Active deals: {d[\"count\"]}')"

curl -s https://mom-drop.com/api/stats | python3 -m json.tool
```

---

*Last updated: 2026-06-14*
