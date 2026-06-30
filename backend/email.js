// =============================================================================
// The Mom Drop — Resend Email Provider Adapter
// =============================================================================
// Sends transactional emails via Resend when EMAIL_SENDING_ENABLED=true.
// Falls back to log-only mode in dev/test — never exposes the API key in logs.
//
// NOTE: All env vars are read lazily from process.env at call time, not
// captured at import. This ensures dotenv.config() works regardless of
// static ESM import ordering.
// =============================================================================

import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Lazily-read env helpers ---
function getApiKey()      { return process.env.RESEND_API_KEY || ''; }
function getFromName()    { return process.env.EMAIL_FROM_NAME || 'The Mom Drop'; }
function getFromAddress() { return process.env.EMAIL_FROM_ADDRESS || 'hello@mom-drop.com'; }
function isSendingEnabled() { return process.env.EMAIL_SENDING_ENABLED === 'true'; }

// --- Paths (computed once; don't depend on env vars) ---
const LOGS_DIR = path.join(__dirname, 'logs');
fs.mkdirSync(LOGS_DIR, { recursive: true });
const NOTIFICATIONS_LOG_PATH = path.join(LOGS_DIR, 'notifications.log');

// --- Provider State ---
let resendClient = null;

function getClient() {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// --- Safe Config Validation (never exposes the key) ---
export function validateEmailConfig() {
  const apiKey = getApiKey();
  const fromAddress = getFromAddress();
  const fromName = getFromName();
  const enabled = isSendingEnabled();
  const hasKey = apiKey.length > 0;

  return {
    configured: hasKey,
    sendingEnabled: enabled,
    fromAddress,
    fromName,
    // NEVER include RESEND_API_KEY itself — just a boolean
    status: hasKey
      ? (enabled ? 'ready' : 'configured_but_disabled')
      : 'not_configured',
    message: hasKey
      ? (enabled
        ? `Resend is configured and EMAIL_SENDING_ENABLED=true. Emails will send from ${fromAddress}.`
        : `Resend API key is set but EMAIL_SENDING_ENABLED=false. Set it to true to enable sending.`)
      : 'Resend API key is not set (RESEND_API_KEY). Emails will be logged only.'
  };
}

// --- Core send function ---
export async function sendEmail({ to, subject, html, text }) {
  const client = getClient();
  const enabled = isSendingEnabled();
  const from = `${getFromName()} <${getFromAddress()}>`;

  if (!client || !enabled) {
    // Log-only mode: record what would have been sent
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [EMAIL_LOG_ONLY] To: ${to} | Subject: ${subject}${enabled ? '' : ' (SENDING DISABLED — set EMAIL_SENDING_ENABLED=true)'}\nBody preview: ${(html || text || '').substring(0, 200)}...\n----------------------------------------\n`;
    fs.appendFileSync(NOTIFICATIONS_LOG_PATH, logEntry);
    console.log(`[EMAIL] Logged email to ${to} (subject: "${subject}") — sending ${client ? 'disabled by EMAIL_SENDING_ENABLED=false' : 'not configured (set RESEND_API_KEY)'}`);
    return { success: true, mode: 'log-only', reason: client ? 'disabled' : 'no-api-key' };
  }

  // Real sending via Resend
  try {
    const { data, error } = await client.emails.send({
      from,
      to: [to],
      subject,
      html: html || '',
      text: text || '',
    });

    if (error) {
      console.error(`[EMAIL] Resend send failed for ${to}:`, error);
      // Also log the failure
      const timestamp = new Date().toISOString();
      fs.appendFileSync(NOTIFICATIONS_LOG_PATH, `[${timestamp}] [EMAIL_FAILURE] To: ${to} | Subject: ${subject}\nError: ${JSON.stringify(error)}\n----------------------------------------\n`);
      return { success: false, error };
    }

    console.log(`[EMAIL] Sent email to ${to} (subject: "${subject}") — Resend ID: ${data?.id}`);
    return { success: true, mode: 'sent', id: data?.id };
  } catch (err) {
    console.error(`[EMAIL] Resend exception for ${to}:`, err);
    return { success: false, error: err.message };
  }
}

// --- Send a test email (for the test script) ---
export async function sendTestEmail(recipient) {
  const config = validateEmailConfig();
  if (!config.configured) {
    return { success: false, message: 'Cannot send test: RESEND_API_KEY is not set.' };
  }
  if (!config.sendingEnabled) {
    return { success: false, message: 'Cannot send test: EMAIL_SENDING_ENABLED=false. Set it to true.' };
  }

  const result = await sendEmail({
    to: recipient,
    subject: 'The Mom Drop — Test Email ✅',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #fff5f5; padding: 40px 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #ffe6e2;">
          <h1 style="color: #FF6F61; font-size: 24px; margin-top: 0;">🙋‍♀️ The Mom Drop</h1>
          <p style="color: #4a5568; font-size: 15px; line-height: 1.6;">
            <strong>Your Resend email integration is working! 🎉</strong>
          </p>
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">
            This is a test email sent from The Mom Drop platform. If you're reading this, your email configuration is set up correctly and you're ready for the email-only MVP launch.
          </p>
          <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #a0aec0; text-align: center;">
            Sent from The Mom Drop &middot; <a href="#" style="color: #a0aec0;">Unsubscribe</a>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  return result;
}
