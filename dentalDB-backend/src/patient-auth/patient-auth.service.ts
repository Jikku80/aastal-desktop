import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { PatientAccount } from './entities/patient-account.entity';

@Injectable()
export class PatientAuthService {
  private readonly logger = new Logger(PatientAuthService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(PatientAccount) private accountRepo: Repository<PatientAccount>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    const host = this.config.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      tls: { rejectUnauthorized: false },
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });

    if (user && pass) {
      this.transporter.verify()
        .then(() => this.logger.log(`SMTP ready — ${host}:${port} as ${user}`))
        .catch((err: any) => this.logger.error(`SMTP verify failed: ${err?.message}`));
    } else {
      this.logger.warn('SMTP_USER / SMTP_PASS not set — OTP emails will only be logged to console');
    }
  }

  private async sendOtpEmail(to: string, otp: string): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM', 'ClinicKarobar <noreply@clinickarobar.com>');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:16px;padding:14px 20px;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:1px;">CK</span>
          </div>
          <h2 style="color:#0f172a;margin:16px 0 4px;font-size:22px;">Your Login Code</h2>
          <p style="color:#64748b;margin:0;font-size:14px;">ClinicKarobar — Patient Portal</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:28px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <p style="color:#475569;font-size:14px;margin:0 0 16px;">Use this one-time code to sign in:</p>
          <div style="letter-spacing:10px;font-size:40px;font-weight:800;color:#0ea5e9;font-family:monospace;margin:0 0 16px;">${otp}</div>
          <p style="color:#94a3b8;font-size:12px;margin:0;">This code expires in <strong>10 minutes</strong>.<br/>If you didn't request this, ignore this email.</p>
        </div>
        <p style="text-align:center;color:#cbd5e1;font-size:11px;margin-top:24px;">ClinicKarobar &mdash; Nepal&apos;s Clinic Management Platform</p>
      </div>`;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `${otp} is your ClinicKarobar login code`,
        html,
        text: `Your ClinicKarobar login code is: ${otp}\n\nThis code expires in 10 minutes.`,
      });
      this.logger.log(`OTP email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Failed to send OTP email to ${to}: ${err?.message}`);
      // Re-throw so the controller can surface a meaningful error
      throw new Error('Could not send OTP email. Please check your email address and try again.');
    }
  }

  /** Lookup or create a PatientAccount by phone or email and send OTP */
  async sendOtp(identifier: string): Promise<{ message: string }> {
    const isPhone = /^\+?\d{7,15}$/.test(identifier.replace(/\s/g, ''));
    const where = isPhone ? { phone: identifier } : { email: identifier };

    let account = await this.accountRepo.findOne({ where });
    if (!account) {
      account = this.accountRepo.create({
        ...(isPhone ? { phone: identifier } : { email: identifier }),
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
    account.otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    account.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await this.accountRepo.save(account);

    // Always log for dev debugging
    this.logger.log(`[OTP] ${identifier} → ${otp}`);

    if (isPhone) {
      // SMS path — Sparrow SMS or Twilio (not wired here; log only for now)
      this.logger.warn(`SMS not configured — OTP for ${identifier}: ${otp}`);
    } else {
      // Email path — send via SMTP
      await this.sendOtpEmail(identifier, otp);
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(identifier: string, otp: string): Promise<{ accessToken: string; account: Partial<PatientAccount> }> {
    const isPhone = /^\+?\d{7,15}$/.test(identifier.replace(/\s/g, ''));
    const where = isPhone ? { phone: identifier } : { email: identifier };

    const account = await this.accountRepo
      .createQueryBuilder('pa')
      .addSelect('pa.otpHash')
      .addSelect('pa.refreshToken')
      .where(where)
      .getOne();

    if (!account) throw new UnauthorizedException('Account not found');
    if (!account.otpExpires || account.otpExpires < new Date()) throw new UnauthorizedException('OTP has expired');

    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    if (hash !== account.otpHash) throw new UnauthorizedException('Invalid OTP');

    // Clear OTP
    account.otpHash = null;
    account.otpExpires = null;
    account.lastLoginAt = new Date();
    await this.accountRepo.save(account);

    const payload = { sub: account.id, type: 'patient' };
    const accessToken = this.jwt.sign(payload);

    return {
      accessToken,
      account: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
        email: account.email,
        hasPassword: account.hasPassword,
      },
    };
  }

  /** Used by the login screen to decide whether to send an OTP or prompt for a password instead. */
  async checkIdentifier(identifier: string): Promise<{ exists: boolean; hasPassword: boolean }> {
    const isPhone = /^\+?\d{7,15}$/.test(identifier.replace(/\s/g, ''));
    const where = isPhone ? { phone: identifier } : { email: identifier };
    const account = await this.accountRepo.findOne({ where });
    return { exists: !!account, hasPassword: !!account?.hasPassword };
  }

  /** Password-based login for returning patients who've already completed setup. */
  async login(identifier: string, password: string): Promise<{ accessToken: string; account: Partial<PatientAccount> }> {
    const isPhone = /^\+?\d{7,15}$/.test(identifier.replace(/\s/g, ''));
    const where = isPhone ? { phone: identifier } : { email: identifier };

    const account = await this.accountRepo
      .createQueryBuilder('pa')
      .addSelect('pa.password')
      .where(where)
      .getOne();

    if (!account || !account.hasPassword || !account.password) {
      throw new UnauthorizedException('Invalid email/phone or password');
    }
    if (!(await bcrypt.compare(password, account.password))) {
      throw new UnauthorizedException('Invalid email/phone or password');
    }

    account.lastLoginAt = new Date();
    await this.accountRepo.save(account);

    const payload = { sub: account.id, type: 'patient' };
    const accessToken = this.jwt.sign(payload);

    return {
      accessToken,
      account: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone,
        email: account.email,
        hasPassword: account.hasPassword,
      },
    };
  }

  /** Lets a patient (already authenticated via OTP) set up email + password for future logins. */
  async setupPassword(accountId: string, email: string | undefined, password: string): Promise<{ message: string }> {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) throw new UnauthorizedException('Account not found');

    if (email && email.trim() && email.trim() !== account.email) {
      const existing = await this.accountRepo.findOne({ where: { email: email.trim() } });
      if (existing && existing.id !== accountId) {
        throw new ConflictException('That email is already in use by another account');
      }
      account.email = email.trim();
    } else if (!account.email && !email) {
      throw new BadRequestException('Email is required to set up password login');
    }

    account.password = await bcrypt.hash(password, 12);
    account.hasPassword = true;
    await this.accountRepo.save(account);

    return { message: 'Password set up successfully' };
  }

  async getAccount(id: string): Promise<PatientAccount> {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new UnauthorizedException('Account not found');
    return account;
  }

  verifyToken(token: string): { sub: string; type: string } {
    try {
      return this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}