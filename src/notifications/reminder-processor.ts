import { prisma } from '../config/database.js';
import { twilioService } from './twilio.service.js';
import { remiderTemplates } from './templates.js';

// ponytail: background processor for pending reminders
// Run via: node --import tsx src/notifications/reminder-processor.ts
// Or: use node-cron / bull queue in production

export class ReminderProcessor {
  async processClinicReminders(clinicId: string) {
    const pendingReminders = await prisma.reminder.findMany({
      where: {
        clinicId,
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      include: {
        patient: { select: { name: true, phone: true } },
        appointment: {
          select: {
            slotStart: true,
            doctor: { select: { name: true } },
          },
        },
      },
    });

    const results = [];

    for (const reminder of pendingReminders) {
      try {
        if (!reminder.patient.phone) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: 'FAILED',
              errorMessage: 'Patient has no phone number',
            },
          });
          results.push({ id: reminder.id, status: 'skipped', reason: 'no_phone' });
          continue;
        }

        const message = remiderTemplates.render(reminder.templateId, {
          patientName: reminder.patient.name,
          appointmentDate: reminder.appointment?.slotStart?.toLocaleDateString() || '',
          doctorName: reminder.appointment?.doctor?.name || '',
          clinicName: '', // Will be fetched from clinic if needed
          ...(reminder.templateData as Record<string, string>),
        });

        const result = reminder.channel === 'WHATSAPP'
          ? await twilioService.sendWhatsApp(reminder.patient.phone, message, {
              clinicId: reminder.clinicId,
              reminderId: reminder.id,
            })
          : await twilioService.sendSMS(reminder.patient.phone, message, {
              clinicId: reminder.clinicId,
              reminderId: reminder.id,
            });

        const sid = typeof result === 'object' && 'sid' in result ? (result as { sid: string }).sid : undefined; // ponytail: type guard

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            providerMessageId: sid,
          },
        });

        results.push({ id: reminder.id, status: 'sent', sid: typeof result === 'object' && 'sid' in result ? result.sid : null });
      } catch (error: any) {
        const retryCount = reminder.retryCount + 1;
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: retryCount >= reminder.maxRetries ? 'FAILED' : 'PENDING',
            errorMessage: error.message,
            retryCount,
          },
        });
        results.push({ id: reminder.id, status: 'failed', error: error.message });
      }
    }

    return results;
  }

  async runAllPending() {
    // Get all clinics with pending reminders
    const clinics = await prisma.clinic.findMany({
      select: { id: true },
    });

    const allResults = [];
    for (const clinic of clinics) {
      const results = await this.processClinicReminders(clinic.id);
      allResults.push(...results);
    }

    return allResults;
  }
}

export const reminderProcessor = new ReminderProcessor();

// CLI runner for testing
const isMain = process.argv[1]?.includes('reminder-processor');
if (isMain) {
  console.log('[ReminderProcessor] Starting...');
  reminderProcessor.runAllPending()
    .then(results => {
      console.log(`[ReminderProcessor] Processed ${results.length} reminders`);
      process.exit(0);
    })
    .catch(err => {
      console.error('[ReminderProcessor] Error:', err);
      process.exit(1);
    });
}