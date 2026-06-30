#!/usr/bin/env node
// =============================================================================
// The Mom Drop — Email Test Utility
// =============================================================================
// Safely validates Resend config without exposing the API key.
// Usage:
//   node scripts/test-email.js                                           # validate only
//   node scripts/test-email.js recipient@example.com                     # validate + send test email
//   TEST_EMAIL_RECIPIENT=recipient@example.com node scripts/test-email.js # via env var instead
//
// Requires: RESEND_API_KEY, and EMAIL_SENDING_ENABLED=true (to send).
// Never prints the API key to console.
// =============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { validateEmailConfig, sendTestEmail } from '../backend/email.js';

async function main() {
  const recipient = process.argv[2] || process.env.TEST_EMAIL_RECIPIENT || '';

  console.log('\n🔍 The Mom Drop — Email Config Validation\n');

  const config = validateEmailConfig();
  console.log(`  Configured:     ${config.configured ? '✅ Yes' : '❌ No'}`);
  console.log(`  Sending enabled: ${config.sendingEnabled ? '✅ Yes' : '❌ No'}`);
  console.log(`  From address:    ${config.fromAddress}`);
  console.log(`  From name:       ${config.fromName}`);
  console.log(`  Status:          ${config.status}`);
  console.log(`  ${config.message}\n`);

  if (!recipient) {
    console.log('📋 To send a test email, pass a recipient address:');
    console.log('   node scripts/test-email.js your@email.com\n');
    process.exit(0);
  }

  if (!config.configured) {
    console.error('❌ Cannot send test: RESEND_API_KEY is not set.');
    console.error('   Add it to your .env file and try again.\n');
    process.exit(1);
  }

  if (!config.sendingEnabled) {
    console.error('❌ Cannot send test: EMAIL_SENDING_ENABLED is not set to true.');
    console.error('   Set EMAIL_SENDING_ENABLED=true in your .env file and try again.\n');
    process.exit(1);
  }

  console.log(`📧 Sending test email to ${recipient}...\n`);

  const result = await sendTestEmail(recipient);

  if (result.success) {
    console.log(`✅ Test email sent! Mode: ${result.mode}${result.id ? ` (Resend ID: ${result.id})` : ''}\n`);
  } else {
    console.error(`❌ Failed to send test email:`, result.error || result.message, '\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
