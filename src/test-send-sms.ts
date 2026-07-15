// Quick test: send SMS to verify Twilio credentials work
// Run with: npx tsx src/test-send-sms.ts <number>
import { twilioService } from './notifications/twilio.service.js';

const args = process.argv.slice(2);
const to = args[0] || '+918050895979';
const message = args[1] || 'Careme test SMS — your appointment is confirmed for tomorrow at 3:30 PM.';

console.log(`[Test SMS] Sending to ${to}...`);
console.log(`[Test SMS] Message: "${message}"`);

try {
  const result = await twilioService.sendSMS(to, message);
  console.log(`[Test SMS] ✓ Sent. SID: ${result.sid}, Status: ${result.status}`);
} catch (err: any) {
  console.error(`[Test SMS] ✗ Failed: ${err.message}`);
  process.exit(1);
}
