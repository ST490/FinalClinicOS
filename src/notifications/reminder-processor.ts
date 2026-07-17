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
        patient: { select: { name: true, phone: true, whatsappConsent: true, smsConsent: true } },
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

    // ponytail: EMAIL has no provider yet — don't silently misroute it to SMS.
    // Mark terminal-FAILED so it's visible instead of quietly SMS-ing the patient.
    if (reminder.channel === 'EMAIL') {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED', errorMessage: 'Email channel not supported yet (no email provider configured)' },
      });
      return { id: reminder.id, status: 'skipped_email_unsupported' };
    }

    // ponytail: consent gate — never message a patient who hasn't opted in for this channel.
    const consented = reminder.channel === 'WHATSAPP' ? reminder.patient.whatsappConsent : reminder.patient.smsConsent;
    if (!consented) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: 'FAILED', errorMessage: `Patient has not consented to ${reminder.channel} messages` },
      });
      return { id: reminder.id, status: 'skipped_no_consent' };
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
      // ponytail: honor maxRetries. While attempts remain, keep the reminder PENDING and
      // re-throw so BullMQ re-enqueues it with exponential backoff. Once exhausted, mark
      // terminal-FAILED and swallow so the job (and any sweep loop) stops retrying.
      const exhausted = reminder.retryCount + 1 >= reminder.maxRetries;
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: exhausted ? 'FAILED' : 'PENDING',
          errorMessage: err.message || String(err),
          retryCount: { increment: 1 },
        },
      });
      if (!exhausted) throw err;
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
      // ponytail: processOneReminder re-throws while retries remain; keep the sweep
      // resilient so one retryable reminder doesn't abort the whole batch.
      try {
        results.push(await this.processOneReminder(id));
      } catch {
        results.push({ id, status: 'FAILED' });
      }
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