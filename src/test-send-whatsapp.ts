// Quick test: send a WhatsApp to specific number
// Run with: npx tsx src/test-send-whatsapp.ts +918050895979 (optional message override)
import { twilioService } from './notifications/twilio.service.js';

const args = process.argv.slice(2);
const to = args[0] || '+918050895979';
const message = args[1] || 'Hi! ClinicOS test message — your appointment is confirmed for tomorrow at 3:30 PM. Reply CONFIRM to acknowledge.';

console.log(`[Test] Sending WhatsApp to ${to}...`);
console.log(`[Test] Message: "${message}"`);

try {
  const result = await twilioService.sendWhatsApp(to, message);
  console.log(`[Test] ✓ Sent. SID: ${result.sid}, Status: ${result.status}`);
} catch (err: any) {
  console.error(`[Test] ✗ Failed: ${err.message}`);
  process.exit(1);
}