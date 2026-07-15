import { prisma } from '../config/database.js';
import { twilioService } from './twilio.service.js';
import { remiderTemplates } from './templates.js';

// ponytail: background processor for pending reminders
// Run via: node --import tsx src/notifications/reminder-processor.ts
// Or: use node-cron / bull queue in production

// Pony-tail: single-reminder processor for BullMQ worker.
// Keeps retry + status side effects in one place; the queue owns scheduling.

export class ReminderProcessor {
  async processOneReminder(reminderId: string): Promise<{ id: string; status: string; sid?: string | null }> {
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        patient: { select: { name: true, phone: true } },
        clinic: { select: { name: true } },
        appointment: {
          select: {
            slotStart: true,
            doctor: { select: { name: true } },
          },
        },
      },
    });

    if (!reminder) throw new Error(`Reminder ${reminderId} not found`);
    if (reminder.status === 'SENT' || reminder.status === 'DELIVERED' || reminder.status === 'READ') {
      return { id: reminder.id, status: 'skipped_already_sent' };
    }
    if (!reminder.patient.phone) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED', errorMessage: 'Patient has no phone number' },
      });
      return { id: reminder.id, status: 'skipped_no_phone' };
    }

    const message = remiderTemplates.render(reminder.templateId, {
      patientName: reminder.patient.name,
      appointmentDate: reminder.appointment?.slotStart?.toLocaleDateString() || '',
      doctorName: reminder.appointment?.doctor?.name || '',
      clinicName: reminder.clinic?.name || '',
      ...(reminder.templateData as Record<string, string>),
    });

    let result;
    try {
      result = reminder.channel === 'WHATSAPP'
        ? await twilioService.sendWhatsApp(reminder.patient.phone, message, {
            clinicId: reminder.clinicId,
            reminderId: reminder.id,
          })
        : await twilioService.sendSMS(reminder.patient.phone, message, {
            clinicId: reminder.clinicId,
            reminderId: reminder.id,
          });
    } catch (err: any) {
      console.error(`[ReminderProcessor] Twilio dispatch failed for reminderId: ${reminder.id}:`, err);
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message || String(err),
        },
      });
      return { id: reminder.id, status: 'FAILED' };
    }

    const sid = typeof result === 'object' && 'sid' in result ? (result as { sid: string }).sid : null;

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: 'SENT', sentAt: new Date(), providerMessageId: sid },
    });

    return { id: reminder.id, status: 'sent', sid };
  }

  async processClinicReminders(clinicId: string) {
    const pendingReminders = await prisma.reminder.findMany({
      where: {
        clinicId,
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      select: { id: true },
    });

    const results = [];
    for (const { id } of pendingReminders) {
      results.push(await this.processOneReminder(id));
    }
    return results;
  }

  async runAllPending() {
    const clinics = await prisma.clinic.findMany({ select: { id: true } });
    const allResults = [];
    for (const { id } of clinics) {
      allResults.push(...(await this.processClinicReminders(id)));
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