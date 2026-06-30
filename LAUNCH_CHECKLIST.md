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

### 2a — Provider: Resend (Owner-Selected)

The email integration is **already wired** using [Resend](https://resend.com). The worker sends deal alerts via `backend/email.js`, which uses the Resend SDK when configured.

**Sender identity**: `The Mom Drop` <hello@mom-drop.com>

### 2b — Obtain and Secure the API Key

> ⚠️ **SECURITY WARNING**: If an API key was previously shared in chat, treat it as **compromised**. 
> 1. Go to https://resend.com/api-keys
> 2. **Revoke/regenerate** the key immediately
> 3. Store the new key securely as an environment variable (never in code, never in chat)
> 4. Set `RESEND_API_KEY=re_xxxxxxxxxxxx` in your `.env` file or hosting dashboard

### 2c — Add DNS Records (SPF / DKIM / DMARC)

In the **GoDaddy DNS manager** (same location as Phase 1), add these records **after** verifying your domain in Resend:

```dns
; SPF — authorize Resend to send on your behalf
TXT  @  "v=spf1 include:spf.resend.com ~all"

; DKIM — Resend provides this key after domain verification
TXT  resend._domainkey  "<resend-dkim-key>"

; DMARC — tell receivers what to do with unauthenticated email
TXT  _dmarc  "v=DMARC1; p=quarantine; rua=mailto:hello@mom-drop.com"
```

> **Important**: DNS propagation can take 1–48 hours. Verify with `dig TXT mom-drop.com` or [MXToolbox](https://mxtoolbox.com). In GoDaddy, use their built-in DNS propagation checker.

### 2d — Enable Sending

By default, email sending is **disabled** (`EMAIL_SENDING_ENABLED=false`). To activate:

1. Set `EMAIL_SENDING_ENABLED=true` in your environment
2. Ensure `RESEND_API_KEY` is set
3. Sender is pre-configured as `The Mom Drop <hello@mom-drop.com>`

### 2e — Test the Integration

Use the safe test utility (never exposes the API key):

```bash
# Validate configuration (safe, no email sent):
node scripts/test-email.js

# Send a single test email (requires EMAIL_SENDING_ENABLED=true + RESEND_API_KEY):
node scripts/test-email.js Shelby.hicks13@gmail.com
# Or via env var:
TEST_EMAIL_RECIPIENT=Shelby.hicks13@gmail.com node scripts/test-email.js
```

The test email will only be sent if **both** `RESEND_API_KEY` is set and `EMAIL_SENDING_ENABLED=true`. Otherwise it logs to `backend/logs/notifications.log`.

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
EMAIL_FROM_NAME=The Mom Drop
EMAIL_FROM_ADDRESS=hello@mom-drop.com
# EMAIL_SENDING_ENABLED=true                 # Enable only after DNS/email auth
# RESEND_API_KEY=re_xxxxxxxxxxxx             # Set securely, never commit
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
| **Email sending** | Wired via Resend. Logs-only until `RESEND_API_KEY` is set and `EMAIL_SENDING_ENABLED=true`. |
| **SMS** | Disabled by default. Requires owner opt-in and Twilio setup. |
| **Background worker** | Runs in-process on server start. For production, consider running as a separate PM2 process or cron job. |
| **Database** | Uses SQLite (single-file). For multi-server scaling, migrate to PostgreSQL. |

---

## 📋 Owner Actions Still Needed

1. ✅ **Confirm** `mom-drop.com` is purchased through GoDaddy (confirmed by owner)
2. ✅ **Choose** Resend as email sending provider (owner-selected)
3. ⬜ **Revoke/regenerate** any API key shared in chat — treat as compromised. Store new key securely as `RESEND_API_KEY` env var
4. ⬜ **Verify** `mom-drop.com` in Resend dashboard and add DNS records (SPF/DKIM/DMARC) in GoDaddy
5. ⬜ **Set** `EMAIL_SENDING_ENABLED=true` after DNS propagation
6. ⬜ **Run** `node scripts/test-email.js Shelby.hicks13@gmail.com` to confirm delivery
7. ⬜ **Provide** Amazon Product Advertising API credentials (for real deal scanning, later)
8. ⬜ **Review** the live site and give feedback

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

# Validate email config (safe, no email sent)
node scripts/test-email.js
```

---

*Last updated: 2026-06-14*
