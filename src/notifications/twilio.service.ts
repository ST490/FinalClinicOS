import twilio from 'twilio';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';

const client = config.twilio.accountSid && config.twilio.authToken
  ? twilio(config.twilio.accountSid, config.twilio.authToken)
  : null;

// ponytail: stub when credentials not configured — add real implementation when needed
export class TwilioService {
  async sendSMS(to: string, body: string, metadata?: { clinicId?: string; reminderId?: string }) {
    if (!client) {
      console.warn('[TwilioService] SMS skipped: credentials not configured');
      return { sid: 'stub-' + Date.now(), status: 'stub' };
    }

    const message = await client.messages.create({
      to,
      from: config.twilio.phoneNumber,
      body,
    });

    // Update reminder with provider message ID
    if (metadata?.reminderId) {
      await prisma.reminder.update({
        where: { id: metadata.reminderId },
        data: {
          providerMessageId: message.sid,
          providerResponse: { sid: message.sid, status: message.status },
        },
      });
    }

    return { sid: message.sid, status: message.status };
  }

  async sendWhatsApp(to: string, body: string, metadata?: { clinicId?: string; reminderId?: string }) {
    // ponytail: WhatsApp via BSP — delegate when WHATSAPP_BSP is configured
    if (!client) {
      console.warn('[TwilioService] WhatsApp skipped: credentials not configured');
      return { sid: 'stub-' + Date.now(), status: 'stub' };
    }

    const message = await client.messages.create({
      to: `whatsapp:${to}`,
      from: `whatsapp:${config.twilio.whatsappPhoneNumber || config.twilio.phoneNumber}`,
      body,
    });

    if (metadata?.reminderId) {
      await prisma.reminder.update({
        where: { id: metadata.reminderId },
        data: {
          providerMessageId: message.sid,
          providerResponse: { sid: message.sid, status: message.status },
        },
      });
    }

    return { sid: message.sid, status: message.status };
  }

  async handleDeliveryStatus(providerMessageId: string, status: string) {
    const statusMap: Record<string, string> = {
      queued: 'PENDING',
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
      undelivered: 'FAILED',
    };

    const mappedStatus = statusMap[status.toLowerCase()] || 'PENDING';

    await prisma.reminder.updateMany({
      where: { providerMessageId },
      data: {
        status: mappedStatus as any,
        ...(mappedStatus === 'SENT' && { sentAt: new Date() }),
        ...(mappedStatus === 'DELIVERED' && { deliveredAt: new Date() }),
      },
    });
  }

  async getMessageStatus(providerMessageId: string) {
    if (!client) return null;

    const message = await client.messages(providerMessageId).fetch();
    return { sid: message.sid, status: message.status };
  }
}

export const twilioService = new TwilioService();