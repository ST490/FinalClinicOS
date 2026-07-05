// ponytail: simple template interpolation — replace with a real templating engine if needed

export const templates: Record<string, (data: Record<string, string>) => string> = {
  APPOINTMENT_REMINDER: (d) =>
    `Hi ${d.patientName || 'Patient'}! This is a reminder for your appointment on ${d.appointmentDate || ''} with Dr. ${d.doctorName || ''}. Reply CONFIRM to confirm or CANCEL to cancel.`,

  APPOINTMENT_CONFIRMED: (d) =>
    `Hi ${d.patientName || 'Patient'}! Your appointment on ${d.appointmentDate || ''} with Dr. ${d.doctorName || ''} is confirmed. See you then!`,

  APPOINTMENT_CANCELLED: (d) =>
    `Hi ${d.patientName || 'Patient'}, your appointment on ${d.appointmentDate || ''} with Dr. ${d.doctorName || ''} has been cancelled. Please contact us to reschedule.`,

  MEDICINE_REMINDER: (d) =>
    `Hi ${d.patientName || 'Patient'}! Reminder: Time to take your medicine - ${d.medicineName || ''}. ${d.instructions || ''}`,

  FOLLOW_UP_REMINDER: (d) =>
    `Hi ${d.patientName || 'Patient'}! It's been ${d.daysSinceVisit || ''} days since your visit. Time to schedule your follow-up appointment.`,

  BILLING_REMINDER: (d) =>
    `Hi ${d.patientName || 'Patient'}! You have a pending balance of ${d.amount || ''}. Please settle at your earliest convenience.`,

  WELCOME: (d) =>
    `Welcome to ${d.clinicName || 'our clinic'}, ${d.patientName || 'Patient'}! Your health journey starts here. Save our number for updates and reminders.`,
};

export const remiderTemplates = {
  render(templateId: string, data: Record<string, string>): string {
    const template = templates[templateId];
    if (!template) {
      // Fallback: return data as formatted string
      return Object.entries(data)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    }
    return template(data);
  },

  list(): string[] {
    return Object.keys(templates);
  },
};