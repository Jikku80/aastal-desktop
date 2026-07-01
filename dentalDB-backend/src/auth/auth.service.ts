import {
  Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { User, UserRole } from '../users/entities/user.entity';
import { Clinic, SubscriptionPlan } from '../clinics/entities/clinic.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { AuthCacheService } from './auth-cache.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { SyncService } from '../sync/sync.service';

const COOKIE_ACCESS  = 'access_token';
const COOKIE_REFRESH = 'refresh_token';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)          private userRepo:          Repository<User>,
    @InjectRepository(Clinic)        private clinicRepo:        Repository<Clinic>,
    @InjectRepository(DoctorProfile) private doctorProfileRepo: Repository<DoctorProfile>,
    private jwtService:    JwtService,
    private config:        ConfigService,
    private notifications: NotificationsService,
    private rbac:          RbacService,
    private auditService:  AuditService,
    private authCache:     AuthCacheService,
    private syncService:   SyncService,
  ) {}

  setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd  = this.config.get('NODE_ENV') === 'production';
    const isHttps = this.config.get('COOKIE_SECURE') === 'true';
    const base = {
      httpOnly: true,
      secure: isProd,
      sameSite: isHttps ? 'none' as const : 'lax' as const,
      path: '/',
    };
    res.cookie(COOKIE_ACCESS,  accessToken,  { ...base, maxAge: 15 * 60 * 1000 });
    res.cookie(COOKIE_REFRESH, refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  clearTokenCookies(res: Response) {
    res.clearCookie(COOKIE_ACCESS,  { path: '/' });
    res.clearCookie(COOKIE_REFRESH, { path: '/' });
  }

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    let clinic: Clinic | null = null;

    if (!dto.clinicId) {
      clinic = this.clinicRepo.create({
        name: dto.clinicName || `${dto.firstName}'s Dental Clinic`,
        slug: this.generateSlug(dto.clinicName || dto.firstName),
        plan: SubscriptionPlan.FREE,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
      clinic = await this.clinicRepo.save(clinic);
    }

    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName:  dto.lastName,
      email:     dto.email,
      password:  hashed,
      role:      dto.clinicId ? (dto.role || UserRole.STAFF) : UserRole.OWNER,
      clinicId:  dto.clinicId || clinic!.id,
      phone:     dto.phone,
    });
    await this.userRepo.save(user);

    // Seed Owner role for new clinics and auto-assign it
    if (!dto.clinicId && clinic) {
      const ownerRole = await this.rbac.seedOwnerRoleForClinic(clinic.id);
      await this.rbac.assignRolesToUser(
        user.id,
        { roleIds: [ownerRole.id] },
        clinic.id,
        'super_admin', // bypass clinic check during registration
      );
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    const permissions = await this.rbac.resolvePermissionsForUser(user.id, user.role);
    // Cookies are set above for web; also return tokens in the body so
    // mobile clients (no cookie jar) can store/replay them as a Bearer
    // token. Additive only — existing web callers ignore these fields.
    return {
      user: this.sanitize(user),
      clinic,
      permissions,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'role', 'clinicId', 'firstName', 'lastName', 'isActive', 'avatar'],
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid email or password');
    if (!(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Invalid email or password');

    const clinic = await this.clinicRepo.findOne({ where: { id: user.clinicId } });
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // Audit login
    setImmediate(() => this.auditService.log({
      clinicId:   user.clinicId,
      userId:     user.id,
      action:     AuditAction.LOGIN,
      entityType: AuditEntityType.AUTH,
      entityId:   user.id,
      changes:    null,
    }));

    // Resolve and return flat permission list so the frontend can store it immediately
    const permissions = await this.rbac.resolvePermissionsForUser(user.id, user.role);

    // Auto-register this device for sync on first online login — replaces
    // the old manual "type in the shared secret" step. No-op on the
    // hosted/Postgres instance and on every login after the first
    // successful one (SyncService checks for an existing token). Never
    // awaited: a slow/unreachable remote must not delay login itself, and
    // failure just means "try again next login" (see the method's docs).
    this.syncService.autoRegisterDeviceIfNeeded(tokens.accessToken).catch((err) => {
      this.logger.warn(`Sync device auto-registration threw unexpectedly: ${err?.message ?? err}`);
    });

    // Cookies are set above for web; also return tokens in the body so
    // mobile clients (no cookie jar) can store/replay them as a Bearer
    // token. Additive only — existing web callers ignore these fields.
    return {
      user: this.sanitize(user),
      clinic,
      permissions,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[COOKIE_REFRESH] || req.body?.refreshToken || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('No refresh token');

    let payload: any;
    let expiredButSignatureValid = false;
    try {
      payload = this.jwtService.verify(token, { secret: this.config.get('JWT_REFRESH_SECRET') });
    } catch (err: any) {
      // Distinguish "expired" from "tampered/wrong secret" — only the former
      // is eligible for the offline grace path below. A bad signature is
      // always a hard reject regardless of online/offline state.
      if (err?.name !== 'TokenExpiredError') throw new UnauthorizedException('Invalid refresh token');
      try {
        payload = this.jwtService.verify(token, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          ignoreExpiration: true,
        });
        expiredButSignatureValid = true;
      } catch {
        throw new UnauthorizedException('Invalid refresh token');
      }
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user?.refreshToken) throw new UnauthorizedException();
    const match = await bcrypt.compare(token, user.refreshToken);
    if (!match) throw new UnauthorizedException('Token mismatch');

    if (expiredButSignatureValid) {
      // Token has a valid signature and matches the stored hash (so it's
      // genuinely this user's last-issued refresh token, not forged) but
      // its `exp` claim has passed. Only allow renewal here on the
      // offline-capable driver, and only within the same grace window used
      // by the JwtStrategy DB-miss fallback — there's no remote session
      // store to consult while offline, so the grace TTL is the only check.
      const driver = this.config.get('DB_DRIVER', 'postgres');
      if (driver !== 'sqlite') throw new UnauthorizedException('Refresh token expired');
      const cached = await this.authCache.getIfFresh(user.id);
      if (!cached) throw new UnauthorizedException('Refresh token expired and no offline grace window available');
      this.logger.warn(`Renewing expired refresh token for user ${user.id} under offline grace window (DB_DRIVER=sqlite)`);
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    // Mobile clients have no cookie jar — they call this endpoint with
    // { refreshToken } in the body (or Bearer header) and need the new
    // pair back in the JSON body to re-store via expo-secure-store.
    return { ok: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async logout(userId: string, res: Response) {
    await this.userRepo.update(userId, { refreshToken: null });
    await this.authCache.invalidate(userId);
    this.clearTokenCookies(res);
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const clinic = await this.clinicRepo.findOne({ where: { id: user.clinicId } });
    const permissions = await this.rbac.resolvePermissionsForUser(user.id, user.role);
    return { user: this.sanitize(user), clinic, permissions };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return { ok: true };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expires  = new Date(Date.now() + 60 * 60 * 1000);

    await this.userRepo.update(user.id, {
      passwordResetToken:   await bcrypt.hash(rawToken, 10),
      passwordResetExpires: expires,
    });

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl    = `${frontendUrl}/auth/reset-password?token=${rawToken}_${user.id}`;

    try {
      await this.notifications.sendEmail({
        to:      user.email,
        subject: 'Reset your ClinicKarobar password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <div style="background:#027cc6;padding:24px 28px;border-radius:10px 10px 0 0">
              <h2 style="color:#fff;margin:0;font-size:20px">Password Reset</h2>
            </div>
            <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px">
              <p style="color:#374151;font-size:15px;margin-bottom:16px">Hi <strong>${user.firstName}</strong>,</p>
              <p style="color:#374151;font-size:15px;margin-bottom:24px">
                We received a request to reset your password. Click the button below to set a new one.
                This link expires in <strong>1 hour</strong>.
              </p>
              <a href="${resetUrl}" style="display:inline-block;background:#027cc6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Reset Password</a>
              <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
              <p style="color:#9ca3af;font-size:11px;margin-top:8px;word-break:break-all">Or copy this link: ${resetUrl}</p>
            </div>
          </div>`,
      });
    } catch (e: any) {
      this.logger.error('ForgotPassword email send failed: ' + e?.message, e?.stack);
      // Still return ok:true — never reveal whether the email exists
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const lastUnderscore = token.lastIndexOf('_');
    if (lastUnderscore === -1) throw new UnauthorizedException('Invalid reset token');

    const rawToken = token.slice(0, lastUnderscore);
    const userId   = token.slice(lastUnderscore + 1);

    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'passwordResetToken', 'passwordResetExpires'],
    });

    if (!user?.passwordResetToken) throw new UnauthorizedException('Invalid or expired reset token');
    if (!user.passwordResetExpires || new Date() > new Date(user.passwordResetExpires))
      throw new UnauthorizedException('Reset token has expired. Please request a new one.');

    const valid = await bcrypt.compare(rawToken, user.passwordResetToken);
    if (!valid) throw new UnauthorizedException('Invalid reset token');

    await this.userRepo.update(userId, {
      password:             await bcrypt.hash(newPassword, 12),
      passwordResetToken:   null,
      passwordResetExpires: null,
      refreshToken:         null,
    });
    return { ok: true };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'clinicId', 'firstName', 'lastName', 'isActive'],
    });
    if (!user) return null;
    return (await bcrypt.compare(password, user.password)) ? user : null;
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, clinicId: user.clinicId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:    this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret:    this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    await this.userRepo.update(userId, { refreshToken: await bcrypt.hash(token, 10) });
  }

  private sanitize(user: User) {
    const { password, refreshToken, passwordResetToken, passwordResetExpires, ...safe } = user as any;
    return safe;
  }

  private generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + uuid().slice(0, 6);
  }

  // ── Doctor OTP ────────────────────────────────────────────────────────────

  private readonly DOCTOR_OTP_THROTTLE = new Map<string, number>();

  async sendDoctorOtp(email: string): Promise<{ message: string }> {
    const lastSent = this.DOCTOR_OTP_THROTTLE.get(email) || 0;
    if (Date.now() - lastSent < 60_000) {
      throw new BadRequestException('Please wait at least 60 seconds before requesting another code.');
    }

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('No account found with that email.');

    const otp = Math.floor(100_000 + Math.random() * 900_000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepo.update(user.id, { emailOtpHash: otpHash, emailOtpExpires: otpExpires } as any);
    this.DOCTOR_OTP_THROTTLE.set(email, Date.now());

    this.logger.log(`[DoctorOTP] ${email} → ${otp}`);

    try {
      await this.notifications.sendEmail({
        to: email,
        subject: `${otp} is your ClinicKarobar verification code`,
        html: `<p>Your ClinicKarobar verification code is:</p><h2 style="letter-spacing:8px;font-family:monospace">${otp}</h2><p>Expires in 10 minutes.</p>`,
      });
    } catch (e) {
      this.logger.warn(`[DoctorOTP] Email failed: ${(e as any)?.message}`);
    }

    return { message: 'Verification code sent to your email.' };
  }

  async verifyDoctorOtp(email: string, otp: string): Promise<{ verified: boolean }> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.emailOtpHash')
      .addSelect('u.emailOtpExpires')
      .where('u.email = :email', { email })
      .getOne();

    if (!user) throw new NotFoundException('Account not found.');

    const hash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpHash    = (user as any).emailOtpHash;
    const otpExpires = (user as any).emailOtpExpires;

    if (!otpHash || hash !== otpHash) throw new UnauthorizedException('Invalid verification code.');
    if (otpExpires && new Date() > new Date(otpExpires)) throw new UnauthorizedException('Verification code has expired.');

    await this.userRepo.update(user.id, {
      isEmailVerified: true,
      emailOtpHash: null,
      emailOtpExpires: null,
    } as any);
    this.DOCTOR_OTP_THROTTLE.delete(email);

    return { verified: true };
  }

  // ── Independent doctor self-signup ────────────────────────────────────────
  // Creates User(role=DOCTOR), then immediately bootstraps a DoctorProfile
  // with isPubliclyListed=true so the doctor appears in discovery results.

  async doctorSignup(
    dto: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      specialization?: string;
    },
    res: Response,
  ) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.userRepo.save(
      this.userRepo.create({
        firstName: dto.firstName,
        lastName:  dto.lastName,
        email:     dto.email,
        phone:     dto.phone,
        password:  hashed,
        role:      UserRole.DOCTOR,
        clinicId:  null,   // independent — no clinic
        isActive:  true,
      }),
    );

    // Bootstrap DoctorProfile immediately so the doctor is publicly discoverable.
    // Without this row, discovery queries that filter isPubliclyListed=true return nothing.
    try {
      const profile = this.doctorProfileRepo.create({
        userId:          user.id,
        isPubliclyListed: true,
        ...(dto.specialization ? { specializations: [dto.specialization] } : {}),
      });
      await this.doctorProfileRepo.save(profile);
    } catch (e) {
      this.logger.warn(`Could not create DoctorProfile for ${user.id}: ${(e as any)?.message}`);
    }

    // Bootstrap RBAC role for independent doctor
    try {
      await this.rbac.ensureIndependentDoctorRole(user.id);
    } catch (e) {
      this.logger.warn(`Could not create independent doctor RBAC role for ${user.id}: ${(e as any)?.message}`);
    }

    await this.auditService.log({
      action:     AuditAction.CREATED,
      entityType: AuditEntityType.USER,
      entityId:   user.id,
      userId:     user.id,
      clinicId:   'independent',
      changes:    { after: { role: UserRole.DOCTOR, email: dto.email } },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, refreshToken);
    this.setCookies(res, accessToken, refreshToken);

    return { user: this.sanitize(user), accessToken };
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = this.config.get('NODE_ENV') === 'production';
    const cookieOpts = { httpOnly: true, secure: isProd, sameSite: 'lax' as const };
    (res as any).cookie('access_token',  accessToken,  { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    (res as any).cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
}
