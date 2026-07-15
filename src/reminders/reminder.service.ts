import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { enqueueReminderSend } from '../jobs/queue.js';
import { reminderProcessor } from '../notifications/reminder-processor.js';
import { CreateReminderInput, ReminderResponse, SearchRemindersInput } from './types/reminder.types.js';

export class ReminderService {
  async create(input: CreateReminderInput): Promise<ReminderResponse> {
    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new Error('Clinic not found');

    const reminder = await prisma.reminder.create({
      data: {
        clinicId: input.clinicId,
        orgId: clinic.orgId,
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        channel: input.channel as any,
        templateId: input.templateId,
        templateData: input.templateData,
        scheduledAt: new Date(input.scheduledAt),
        status: 'PENDING',
      },
      include: { patient: { select: { name: true } } },
    });

    // ponytail: schedule via BullMQ instead of inline send — survives restarts and retries with backoff
    const queued = await enqueueReminderSend(reminder.id, reminder.scheduledAt);

    // Fallback for when Redis (and thus BullMQ) is unavailable: best-effort
    // inline send for due-now reminders so the loop still works with zero infra.
    // Future-dated reminders stay PENDING; the worker/sweep flushes them later.
    if (!queued && reminder.scheduledAt.getTime() <= Date.now()) {
      void reminderProcessor.processOneReminder(reminder.id).catch((e) =>
        console.error('[ReminderService] inline fallback send failed:', e)
      );
    }

    return this.formatReminder(reminder);
  }

  async search(input: SearchRemindersInput): Promise<{ data: ReminderResponse[]; pagination: any }> {
    const page = input.page || 1;
    const limit = Math.min(input.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ReminderWhereInput = {
      ...(input.clinicId && { clinicId: input.clinicId }),
      ...(input.patientId && { patientId: input.patientId }),
      ...(input.appointmentId && { appointmentId: input.appointmentId }),
      ...(input.status && { status: input.status as any }),
      ...(input.channel && { channel: input.channel as any }),
    };

    const [reminders, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: { patient: { select: { name: true } } },
      }),
      prisma.reminder.count({ where }),
    ]);

    return {
      data: reminders.map(r => this.formatReminder(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(
    providerMessageId: string,
    status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
    error?: string
  ): Promise<void> {
    const update: any = { status: status as any };
    if (status === 'SENT') update.sentAt = new Date();
    if (status === 'DELIVERED') update.deliveredAt = new Date();
    if (status === 'FAILED') {
      update.errorMessage = error;
      update.retryCount = { increment: 1 };
    }

    await prisma.reminder.updateMany({
      where: { providerMessageId },
      data: update,
    });
  }

  async getPendingReminders(clinicId: string): Promise<ReminderResponse[]> {
    const reminders = await prisma.reminder.findMany({
      where: {
        clinicId,
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      include: { patient: { select: { name: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
    return reminders.map(r => this.formatReminder(r));
  }

  private formatReminder(reminder: any): ReminderResponse {
    return {
      id: reminder.id,
      clinicId: reminder.clinicId,
      orgId: reminder.orgId,
      patientId: reminder.patientId,
      appointmentId: reminder.appointmentId,
      channel: reminder.channel,
      templateId: reminder.templateId,
      templateData: reminder.templateData,
      scheduledAt: reminder.scheduledAt,
      sentAt: reminder.sentAt,
      deliveredAt: reminder.deliveredAt,
      status: reminder.status,
      retryCount: reminder.retryCount,
      errorMessage: reminder.errorMessage,
      createdAt: reminder.createdAt,
      patientName: reminder.patient?.name,
    };
  }
}

export const reminderService = new ReminderService();