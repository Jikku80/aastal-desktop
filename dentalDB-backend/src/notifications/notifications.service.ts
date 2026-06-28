import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { formatNepalTime } from '../common/utils/timezone.util';
import { Notification, NotificationType } from './entities/notification.entity';
import { SparrowSmsService } from './sparrow-sms.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    private config: ConfigService,
    private readonly sparrowSms: SparrowSmsService,
  ) {
    const host = config.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = config.get<number>('SMTP_PORT', 465);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      tls: { rejectUnauthorized: false },
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    if (user && pass) {
      this.transporter.verify().then(() => {
        this.logger.log(`SMTP ready — ${host}:${port} as ${user}`);
      }).catch((err: any) => {
        this.logger.error(`SMTP connection FAILED: ${err?.message}`);
        this.logger.error('Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your .env');
      });
    } else {
      this.logger.warn('SMTP credentials not set — email sending is disabled');
    }
  }

  // ── In-app notifications ───────────────────────────────────────────────────

  async create(data: {
    clinicId: string;
    userId?: string;
    branchId?: string;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
    entityId?: string;
  }): Promise<Notification> {
    const notif = this.notifRepo.create(data);
    return this.notifRepo.save(notif);
  }

  async findForUser(clinicId: string, userId: string, limit = 30, branchId?: string) {
    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.clinicId = :clinicId AND (n.userId = :userId OR n.userId IS NULL)', { clinicId, userId });

    if (branchId) {
      qb.andWhere('(n.branchId IS NULL OR n.branchId = :branchId)', { branchId });
    }

    return qb.orderBy('n.createdAt', 'DESC').take(limit).getMany();
  }

  async getUnreadCount(clinicId: string, userId: string, branchId?: string): Promise<number> {
    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.clinicId = :clinicId AND (n.userId = :userId OR n.userId IS NULL) AND n.isRead = false', { clinicId, userId });

    if (branchId) {
      qb.andWhere('(n.branchId IS NULL OR n.branchId = :branchId)', { branchId });
    }

    return qb.getCount();
  }

  async markRead(clinicId: string, id: string) {
    await this.notifRepo.update({ id, clinicId }, { isRead: true });
  }

  async markAllRead(clinicId: string, userId: string, branchId?: string) {
    const qb = this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('clinicId = :clinicId AND (userId = :userId OR userId IS NULL) AND isRead = false', { clinicId, userId });

    if (branchId) {
      qb.andWhere('(branchId IS NULL OR branchId = :branchId)', { branchId });
    }

    await qb.execute();
  }

  // ── Email ──────────────────────────────────────────────────────────────────

  async sendEmail(opts: { to: string; subject: string; html: string }) {
    const smtpUser = this.config.get('SMTP_USER');
    if (!smtpUser) {
      this.logger.warn('SMTP not configured — skipping email');
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', 'ClinicKarobar <noreply@clinickarobar.com>'),
        ...opts,
      });
      this.logger.log(`Email sent to ${opts.to}`);
    } catch (e: any) {
      this.logger.error(`Email failed to ${opts.to}: ${e?.message}`, e?.stack);
      throw e;
    }
  }

  // ── SMS via Sparrow SMS (Nepal) ────────────────────────────────────────────

  /**
   * Send an SMS. Uses Sparrow SMS (Nepal).
   * Env: SPARROW_SMS_TOKEN, SPARROW_SMS_FROM
   */
  async sendSms(to: string, body: string): Promise<void> {
    await this.sparrowSms.send(to, body);
  }

  // ── Shared helpers ─────────────────────────────────────────────────────────

  private buildContactFooter(contact: {
    clinicName: string;
    address?: string;
    phone?: string;
    email?: string;
  }): string {
    const lines: string[] = [];
    if (contact.address) lines.push(`📍 ${contact.address}`);
    if (contact.phone)   lines.push(`📞 ${contact.phone}`);
    if (contact.email)   lines.push(`✉️ ${contact.email}`);
    if (!lines.length) return '';

    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-top:20px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.04em;">Contact Us</p>
        ${lines.map(l => `<p style="margin:4px 0;font-size:13px;color:#374151;">${l}</p>`).join('')}
      </div>
    `;
  }

  // ── Appointment Reminder — Patient ────────────────────────────────────────

  async sendAppointmentReminder(apt: {
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    doctorName: string;
    clinicName: string;
    clinicPhone?: string;
    clinicEmail?: string;
    clinicAddress?: string;
    scheduledAt: Date;
    type: string;
  }) {
    const dateStr = apt.scheduledAt.toLocaleDateString('en', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const timeStr = formatNepalTime(apt.scheduledAt, { hour: '2-digit', minute: '2-digit' });
    const appointmentType = apt.type.replace('_', ' ');

    let smsSent = false;

    if (apt.patientPhone) {
      const contactInfo = apt.clinicPhone ? ` Contact: ${apt.clinicPhone}.` : '';
      smsSent = await this.sparrowSms.send(
        apt.patientPhone,
        `ClinicKarobar: Hi ${apt.patientName}, reminder — ${appointmentType} appointment TOMORROW at ${timeStr} with Dr. ${apt.doctorName} at ${apt.clinicName}.${contactInfo}`,
      );
    }

    if (!smsSent && apt.patientEmail) {
      try {
        const contactFooter = this.buildContactFooter({
          clinicName: apt.clinicName,
          address: apt.clinicAddress,
          phone: apt.clinicPhone,
          email: apt.clinicEmail,
        });

        await this.sendEmail({
          to: apt.patientEmail,
          subject: `Reminder: Appointment Tomorrow — ${timeStr} at ${apt.clinicName}`,
          html: `
            <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">
              <div style="background:#027cc6;padding:24px 32px;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:22px;">${apt.clinicName}</h1>
              </div>
              <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
                <h2 style="color:#1f2937;margin-top:0;">Appointment Reminder</h2>
                <p>Dear <strong>${apt.patientName}</strong>,</p>
                <p>You have an appointment <strong>tomorrow</strong>.</p>
                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:24px 0;">
                  <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px;">📅 Date</td><td style="padding:8px 0;font-weight:600;">${dateStr}</td></tr>
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">⏰ Time</td><td style="padding:8px 0;font-weight:600;">${timeStr}</td></tr>
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Type</td><td style="padding:8px 0;font-weight:600;text-transform:capitalize;">${appointmentType}</td></tr>
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">👨‍⚕️ Doctor</td><td style="padding:8px 0;font-weight:600;">Dr. ${apt.doctorName}</td></tr>
                  </table>
                </div>
                <p style="color:#6b7280;font-size:13px;">Please arrive 5–10 minutes early.</p>
                ${contactFooter}
              </div>
              <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">Powered by ClinicKarobar &bull; ${new Date().getFullYear()}</p>
            </div>`,
        });
      } catch (e: any) {
        this.logger.error(`[AppointmentReminder] Email failed for ${apt.patientName}: ${e?.message}`);
      }
    }
  }

  // ── Doctor Appointment Reminder ───────────────────────────────────────────

  async sendDoctorAppointmentReminder(apt: {
    doctorName: string;
    doctorPhone: string;
    doctorEmail: string;
    patientName: string;
    clinicName: string;
    scheduledAt: Date;
    type: string;
  }) {
    const timeStr = formatNepalTime(apt.scheduledAt, { hour: '2-digit', minute: '2-digit' });
    const appointmentType = apt.type.replace('_', ' ');

    let smsSent = false;

    if (apt.doctorPhone) {
      smsSent = await this.sparrowSms.send(
        apt.doctorPhone,
        `ClinicKarobar: Dr. ${apt.doctorName}, reminder — ${apt.patientName} has a ${appointmentType} in ~2 hours at ${timeStr} at ${apt.clinicName}.`,
      );
    }

    if (!smsSent && apt.doctorEmail) {
      try {
        const dateStr = apt.scheduledAt.toLocaleDateString('en', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        await this.sendEmail({
          to: apt.doctorEmail,
          subject: `Upcoming Appointment in ~2 Hours — ${apt.patientName} at ${timeStr}`,
          html: `
            <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">
              <div style="background:#027cc6;padding:24px 32px;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:22px;">${apt.clinicName}</h1>
              </div>
              <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
                <h2 style="color:#1f2937;margin-top:0;">Appointment in ~2 Hours</h2>
                <p>Dear <strong>Dr. ${apt.doctorName}</strong>,</p>
                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:24px 0;">
                  <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px;">📅 Date</td><td style="padding:8px 0;font-weight:600;">${dateStr}</td></tr>
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">⏰ Time</td><td style="padding:8px 0;font-weight:600;">${timeStr}</td></tr>
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Type</td><td style="padding:8px 0;font-weight:600;text-transform:capitalize;">${appointmentType}</td></tr>
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">🧑‍⚕️ Patient</td><td style="padding:8px 0;font-weight:600;">${apt.patientName}</td></tr>
                  </table>
                </div>
              </div>
              <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">Powered by ClinicKarobar &bull; ${new Date().getFullYear()}</p>
            </div>`,
        });
      } catch (e: any) {
        this.logger.error(`[DoctorReminder] Email failed for Dr. ${apt.doctorName}: ${e?.message}`);
      }
    }
  }

  // ── Invoice notification ───────────────────────────────────────────────────

  async sendInvoiceEmail(opts: {
    patientEmail: string;
    patientName: string;
    patientPhone?: string;
    invoiceNumber: string;
    total: number;
    clinicName: string;
  }) {
    // SMS first
    if (opts.patientPhone) {
      await this.sparrowSms.sendSafe(
        opts.patientPhone,
        `ClinicKarobar: Invoice ${opts.invoiceNumber} from ${opts.clinicName} — NPR ${opts.total.toLocaleString()}. Check your patient portal for details.`,
      );
    }

    await this.sendEmail({
      to: opts.patientEmail,
      subject: `Invoice ${opts.invoiceNumber} — ${opts.clinicName}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <h2>Invoice ${opts.invoiceNumber}</h2>
          <p>Dear ${opts.patientName},</p>
          <p>Your invoice from <strong>${opts.clinicName}</strong> for <strong>NPR ${opts.total.toLocaleString()}</strong> is ready.</p>
          <p>Thank you for choosing ${opts.clinicName}.</p>
        </div>`,
    });
  }

  // ── Subscription Invoice Email ─────────────────────────────────────────────

  async sendSubscriptionInvoiceEmail(opts: {
    clinicEmail: string;
    clinicName: string;
    plan: string;
    billingCycle: string;
    amount: number;
    invoiceNumber: string;
    transactionId: string;
    periodStart: Date;
    periodEnd: Date;
    paymentMethod: string;
  }) {
    const fmtDate = (d: Date) => d.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
    const fmtNPR  = (n: number) => `NPR ${n.toLocaleString()}`;
    const planLabel   = opts.plan.charAt(0).toUpperCase() + opts.plan.slice(1);
    const cycleLabel  = opts.billingCycle === 'yearly' ? 'Annual' : 'Monthly';
    const methodLabel = (opts.paymentMethod || 'online').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    await this.sendEmail({
      to: opts.clinicEmail,
      subject: `Payment Confirmed — ClinicKarobar ${planLabel} Plan (${opts.invoiceNumber})`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;color:#1f2937;">
          <div style="background:linear-gradient(135deg,#027cc6,#0ea5e9);padding:28px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">ClinicKarobar</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Subscription Invoice</p>
          </div>
          <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
            <div style="display:flex;align-items:center;gap:10px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
              <span style="font-size:20px;">✅</span>
              <div>
                <p style="margin:0;font-weight:700;color:#065f46;font-size:14px;">Payment Successful</p>
                <p style="margin:2px 0 0;color:#047857;font-size:12px;">Your ClinicKarobar subscription has been activated.</p>
              </div>
            </div>
            <h2 style="color:#1f2937;margin:0 0 20px;font-size:17px;">Invoice ${opts.invoiceNumber}</h2>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="background:#f3f4f6;">
                    <th style="text-align:left;padding:10px 16px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Description</th>
                    <th style="text-align:right;padding:10px 16px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-top:1px solid #e5e7eb;">
                    <td style="padding:14px 16px;">
                      <p style="margin:0;font-weight:600;color:#1f2937;font-size:14px;">ClinicKarobar ${planLabel} Plan</p>
                      <p style="margin:3px 0 0;color:#6b7280;font-size:12px;">${cycleLabel} subscription • ${fmtDate(opts.periodStart)} – ${fmtDate(opts.periodEnd)}</p>
                    </td>
                    <td style="padding:14px 16px;text-align:right;font-weight:700;color:#1f2937;font-size:15px;">${fmtNPR(opts.amount)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr style="background:#f9fafb;border-top:2px solid #e5e7eb;">
                    <td style="padding:12px 16px;font-weight:700;color:#1f2937;font-size:14px;">Total Paid</td>
                    <td style="padding:12px 16px;text-align:right;font-weight:800;color:#027cc6;font-size:16px;">${fmtNPR(opts.amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:24px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:5px 0;color:#6b7280;font-size:12px;width:160px;">Invoice Number</td><td style="padding:5px 0;font-weight:600;color:#1f2937;font-size:12px;">${opts.invoiceNumber}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:12px;">Transaction ID</td><td style="padding:5px 0;font-weight:600;color:#1f2937;font-size:12px;font-family:monospace;">${opts.transactionId}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:12px;">Payment Method</td><td style="padding:5px 0;font-weight:600;color:#1f2937;font-size:12px;">${methodLabel}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:12px;">Next Renewal</td><td style="padding:5px 0;font-weight:600;color:#1f2937;font-size:12px;">${fmtDate(opts.periodEnd)}</td></tr>
                <tr><td style="padding:5px 0;color:#6b7280;font-size:12px;">Clinic</td><td style="padding:5px 0;font-weight:600;color:#1f2937;font-size:12px;">${opts.clinicName}</td></tr>
              </table>
            </div>
            <p style="color:#6b7280;font-size:12px;line-height:1.7;margin:0;">
              Questions? Contact <a href="mailto:support@clinickarobar.com" style="color:#027cc6;">support@clinickarobar.com</a>.
            </p>
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">ClinicKarobar &bull; ${new Date().getFullYear()}</p>
        </div>`,
    });
  }

  // ── Subscription Expiry Warning ────────────────────────────────────────────

  async sendSubscriptionExpiryWarning(opts: {
    clinicEmail: string;
    clinicPhone?: string;
    clinicName: string;
    plan: string;
    expiresAt: Date;
    renewalLink: string;
  }) {
    const planLabel  = opts.plan.charAt(0).toUpperCase() + opts.plan.slice(1);
    const expiryDate = opts.expiresAt.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // SMS first
    if (opts.clinicPhone) {
      await this.sparrowSms.sendSafe(
        opts.clinicPhone,
        `ClinicKarobar: Your ${planLabel} subscription expires in 2 days (${expiryDate}). Renew now: ${opts.renewalLink}`,
      );
    }

    await this.sendEmail({
      to: opts.clinicEmail,
      subject: `Your ClinicKarobar ${planLabel} subscription expires in 2 days`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;color:#1f2937;">
          <div style="background:linear-gradient(135deg,#d97706,#f59e0b);padding:28px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">ClinicKarobar</h1>
            <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px;">Subscription Expiry Notice</p>
          </div>
          <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
            <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-weight:700;color:#92400e;">⏰ Subscription Expiring Soon</p>
              <p style="margin:4px 0 0;color:#78350f;font-size:13px;">
                Your <strong>ClinicKarobar ${planLabel}</strong> subscription for <strong>${opts.clinicName}</strong> will expire on <strong>${expiryDate}</strong> — in just 2 days.
              </p>
            </div>
            <p style="color:#374151;font-size:14px;line-height:1.7;">
              After expiry, your clinic will be locked and staff will lose access to all features until renewed.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${opts.renewalLink}" style="display:inline-block;background:#027cc6;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;">
                Renew Subscription Now
              </a>
            </div>
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">ClinicKarobar &bull; ${new Date().getFullYear()}</p>
        </div>`,
    });
  }

  // ── Subscription Expired ───────────────────────────────────────────────────

  async sendSubscriptionExpiredNotification(opts: {
    clinicEmail: string;
    clinicPhone?: string;
    clinicName: string;
    plan: string;
    expiredAt: Date;
    renewalLink: string;
  }) {
    const planLabel   = opts.plan.charAt(0).toUpperCase() + opts.plan.slice(1);
    const expiredDate = opts.expiredAt.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });

    if (opts.clinicPhone) {
      await this.sparrowSms.sendSafe(
        opts.clinicPhone,
        `ClinicKarobar: Your ${planLabel} subscription EXPIRED on ${expiredDate}. Clinic is locked. Renew now: ${opts.renewalLink}`,
      );
    }

    await this.sendEmail({
      to: opts.clinicEmail,
      subject: `Your ClinicKarobar ${planLabel} subscription has expired`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:580px;margin:0 auto;color:#1f2937;">
          <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:28px 32px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">ClinicKarobar</h1>
          </div>
          <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-weight:700;color:#991b1b;">Subscription Expired</p>
              <p style="margin:4px 0 0;color:#7f1d1d;font-size:13px;">
                Your <strong>ClinicKarobar ${planLabel}</strong> subscription for <strong>${opts.clinicName}</strong> expired on <strong>${expiredDate}</strong>. Your clinic is now locked.
              </p>
            </div>
            <div style="text-align:center;margin:28px 0;">
              <a href="${opts.renewalLink}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;">
                Renew &amp; Restore Access
              </a>
            </div>
            <p style="color:#9ca3af;font-size:12px;">
              Your data is safe. Contact <a href="mailto:support@clinickarobar.com" style="color:#027cc6;">support@clinickarobar.com</a> for help.
            </p>
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">ClinicKarobar &bull; ${new Date().getFullYear()}</p>
        </div>`,
    });
  }

  // ── Multi-channel patient notification ────────────────────────────────────

  async sendPatientNotification(opts: {
    eventType: string;
    to: { phone?: string; email?: string };
    subject: string;
    body: string;
    html?: string;
    prefs?: Record<string, Record<string, boolean>>;
  }): Promise<void> {
    const prefs = opts.prefs?.[opts.eventType] ?? { email: true, sms: true };

    const tasks: Promise<any>[] = [];

    if (prefs.sms && opts.to.phone) {
      tasks.push(this.sparrowSms.sendSafe(opts.to.phone, opts.body));
    }

    if (prefs.email && opts.to.email) {
      tasks.push(
        this.sendEmail({
          to: opts.to.email,
          subject: opts.subject,
          html: opts.html || `<p>${opts.body}</p>`,
        }).catch(e => this.logger.warn(`Patient email failed: ${e?.message}`)),
      );
    }

    await Promise.allSettled(tasks);
  }

  // ── Booking Confirmation ───────────────────────────────────────────────────

  async sendBookingConfirmation(opts: {
    patientName: string;
    patientPhone?: string;
    patientEmail?: string;
    clinicName: string;
    doctorName?: string;
    scheduledAt: Date;
    consultationType: string;
    prefs?: Record<string, Record<string, boolean>>;
  }): Promise<void> {
    const dateStr = opts.scheduledAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = formatNepalTime(opts.scheduledAt, { hour: '2-digit', minute: '2-digit' });
    const typeLabel = opts.consultationType === 'video' ? 'Video Consultation' : 'In-Person Visit';

    await this.sendPatientNotification({
      eventType: 'bookingConfirmation',
      to: { phone: opts.patientPhone, email: opts.patientEmail },
      subject: `Appointment Confirmed — ${opts.clinicName}`,
      body: `ClinicKarobar: Hi ${opts.patientName}, your appointment at ${opts.clinicName}${opts.doctorName ? ` with Dr. ${opts.doctorName}` : ''} is confirmed for ${dateStr} at ${timeStr} (${typeLabel}).`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
          <div style="background:#0284c7;padding:20px 28px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">✅ Appointment Confirmed</h1>
          </div>
          <div style="background:#f9fafb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
            <p>Hi <strong>${opts.patientName}</strong>,</p>
            <p>Your appointment has been confirmed:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Clinic</td><td style="padding:8px 0;font-weight:600;">${opts.clinicName}</td></tr>
              ${opts.doctorName ? `<tr><td style="padding:8px 0;color:#6b7280;">Doctor</td><td style="padding:8px 0;font-weight:600;">Dr. ${opts.doctorName}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="padding:8px 0;font-weight:600;">${dateStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="padding:8px 0;font-weight:600;">${timeStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Type</td><td style="padding:8px 0;font-weight:600;">${typeLabel}</td></tr>
            </table>
          </div>
        </div>`,
      prefs: opts.prefs,
    });
  }

  // ── Review Request ─────────────────────────────────────────────────────────

  async sendReviewRequest(opts: {
    patientName: string;
    patientPhone?: string;
    patientEmail?: string;
    clinicName: string;
    appointmentId: string;
    portalUrl: string;
    prefs?: Record<string, Record<string, boolean>>;
  }): Promise<void> {
    const reviewUrl = `${opts.portalUrl}/portal/reviews?appointmentId=${opts.appointmentId}`;

    await this.sendPatientNotification({
      eventType: 'reviewRequest',
      to: { phone: opts.patientPhone, email: opts.patientEmail },
      subject: `How was your visit to ${opts.clinicName}?`,
      body: `ClinicKarobar: Hi ${opts.patientName}, how was your visit to ${opts.clinicName}? Share your feedback: ${reviewUrl}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
          <div style="background:#7c3aed;padding:20px 28px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">⭐ Share Your Feedback</h1>
          </div>
          <div style="background:#f9fafb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
            <p>Hi <strong>${opts.patientName}</strong>,</p>
            <p>Thank you for visiting <strong>${opts.clinicName}</strong>. Your feedback helps others.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${reviewUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;">
                Leave a Review
              </a>
            </div>
          </div>
        </div>`,
      prefs: opts.prefs,
    });
  }

  // ── OTP (patient login) via Sparrow SMS ───────────────────────────────────

  async sendOtpSms(phone: string, otp: string): Promise<void> {
    await this.sparrowSms.sendSafe(
      phone,
      `ClinicKarobar: Your OTP is ${otp}. Valid for 10 minutes. Do not share this code.`,
    );
  }

  // ── Appointment cancellation ───────────────────────────────────────────────

  async sendAppointmentCancellation(opts: {
    patientName: string;
    patientPhone?: string;
    patientEmail?: string;
    clinicName: string;
    doctorName?: string;
    scheduledAt: Date;
    reason?: string;
  }): Promise<void> {
    const dateStr = opts.scheduledAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = formatNepalTime(opts.scheduledAt, { hour: '2-digit', minute: '2-digit' });

    await this.sendPatientNotification({
      eventType: 'appointmentCancellation',
      to: { phone: opts.patientPhone, email: opts.patientEmail },
      subject: `Appointment Cancelled — ${opts.clinicName}`,
      body: `ClinicKarobar: Hi ${opts.patientName}, your appointment at ${opts.clinicName}${opts.doctorName ? ` with Dr. ${opts.doctorName}` : ''} on ${dateStr} at ${timeStr} has been cancelled.${opts.reason ? ` Reason: ${opts.reason}` : ''} Please rebook via the app.`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
          <div style="background:#ef4444;padding:20px 28px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">❌ Appointment Cancelled</h1>
          </div>
          <div style="background:#f9fafb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
            <p>Hi <strong>${opts.patientName}</strong>,</p>
            <p>Your appointment has been cancelled:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Clinic</td><td style="padding:8px 0;font-weight:600;">${opts.clinicName}</td></tr>
              ${opts.doctorName ? `<tr><td style="padding:8px 0;color:#6b7280;">Doctor</td><td style="padding:8px 0;font-weight:600;">Dr. ${opts.doctorName}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="padding:8px 0;font-weight:600;">${dateStr}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="padding:8px 0;font-weight:600;">${timeStr}</td></tr>
              ${opts.reason ? `<tr><td style="padding:8px 0;color:#6b7280;">Reason</td><td style="padding:8px 0;">${opts.reason}</td></tr>` : ''}
            </table>
            <p style="color:#6b7280;font-size:13px;">Please log in to your patient portal to rebook.</p>
          </div>
        </div>`,
    });
  }

  // ── Lab result ready ───────────────────────────────────────────────────────

  async sendLabResultReady(opts: {
    patientName: string;
    patientPhone?: string;
    patientEmail?: string;
    clinicName: string;
    testName: string;
    portalUrl: string;
  }): Promise<void> {
    await this.sendPatientNotification({
      eventType: 'labResultReady',
      to: { phone: opts.patientPhone, email: opts.patientEmail },
      subject: `Lab Result Ready — ${opts.clinicName}`,
      body: `ClinicKarobar: Hi ${opts.patientName}, your ${opts.testName} result from ${opts.clinicName} is ready. View it at: ${opts.portalUrl}/portal/records`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
          <div style="background:#059669;padding:20px 28px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:20px;">🧪 Lab Result Ready</h1>
          </div>
          <div style="background:#f9fafb;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:0;">
            <p>Hi <strong>${opts.patientName}</strong>,</p>
            <p>Your <strong>${opts.testName}</strong> result from <strong>${opts.clinicName}</strong> is now available in your patient portal.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${opts.portalUrl}/portal/records" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;">
                View Result
              </a>
            </div>
          </div>
        </div>`,
    });
  }

  // ── Cross-clinic patient notification helpers ──────────────────────────────
  // Used by PatientPortalService to query notifications across multiple clinics
  // without requiring a staff JWT. These scope to patient-relevant types only.

  createPatientQueryBuilder(clinicIds: string[], types: NotificationType[]) {
    return this.notifRepo
      .createQueryBuilder('n')
      .where('n.clinicId IN (:...clinicIds)', { clinicIds })
      .andWhere('n.type IN (:...types)', { types });
  }

  async getPatientUnreadCount(clinicIds: string[], types: NotificationType[]): Promise<number> {
    if (!clinicIds.length) return 0;
    return this.notifRepo
      .createQueryBuilder('n')
      .where('n.clinicId IN (:...clinicIds)', { clinicIds })
      .andWhere('n.type IN (:...types)', { types })
      .andWhere('n.isRead = false')
      .getCount();
  }

  async markReadForPatient(clinicIds: string[], notifId: string): Promise<void> {
    if (!clinicIds.length) return;
    await this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('id = :notifId AND clinicId IN (:...clinicIds)', { notifId, clinicIds })
      .execute();
  }

  async markAllReadForPatient(clinicIds: string[], types: NotificationType[]): Promise<void> {
    if (!clinicIds.length) return;
    await this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('clinicId IN (:...clinicIds) AND type IN (:...types) AND isRead = false', { clinicIds, types })
      .execute();
  }
}