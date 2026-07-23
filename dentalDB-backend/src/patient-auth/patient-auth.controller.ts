import { Controller, Post, Get, Body, Req, Res, UnauthorizedException } from '@nestjs/common';
import { PatientAuthService } from './patient-auth.service';
import { Request, Response } from 'express';

@Controller('patient-auth')
export class PatientAuthController {
  constructor(private readonly patientAuthService: PatientAuthService) {}

  @Post('otp/send')
  async sendOtp(@Body('identifier') identifier: string) {
    if (!identifier?.trim()) throw new UnauthorizedException('Identifier is required');
    return this.patientAuthService.sendOtp(identifier.trim());
  }

  @Post('otp/verify')
  async verifyOtp(
    @Body('identifier') identifier: string,
    @Body('otp') otp: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.patientAuthService.verifyOtp(identifier, otp);
    // Set httpOnly cookie for web clients (cookie jar handles this transparently)
    // sameSite must be 'none' (with secure:true) in production — frontend
    // and backend are on different domains there, and a cross-site
    // request silently drops any cookie set with the 'lax' default. See
    // AuthService.setTokenCookies for the full explanation; this mirrors
    // that same fix for the patient cookie.
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('patient_token', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' as const : 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    // Also return the token in the body for clients with no cookie jar
    // (React Native / mobile), which store it themselves (e.g. expo-secure-store)
    // and send it back as `Authorization: Bearer <token>`. This is a superset
    // of the previous web-only response — existing web callers are unaffected
    // since they already ignore this field and rely on the cookie.
    return { account: result.account, accessToken: result.accessToken };
  }

  /** Used by the login screen to decide: send an OTP (first-time patients) or ask for a password (returning patients who've set one up). */
  @Post('check-identifier')
  async checkIdentifier(@Body('identifier') identifier: string) {
    if (!identifier?.trim()) throw new UnauthorizedException('Identifier is required');
    return this.patientAuthService.checkIdentifier(identifier.trim());
  }

  @Post('login')
  async login(
    @Body('identifier') identifier: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!identifier?.trim() || !password) throw new UnauthorizedException('Identifier and password are required');
    const result = await this.patientAuthService.login(identifier.trim(), password);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('patient_token', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' as const : 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return { account: result.account, accessToken: result.accessToken };
  }

  /** Called after a patient's first OTP login to let them set up email + password for future sign-ins. */
  @Post('setup-password')
  async setupPassword(
    @Body('email') email: string,
    @Body('password') password: string,
    @Req() req: Request,
  ) {
    const token = req.cookies?.patient_token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException();
    const payload = this.patientAuthService.verifyToken(token);
    return this.patientAuthService.setupPassword(payload.sub, email, password);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('patient_token');
    return { message: 'Logged out' };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const token = req.cookies?.patient_token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException();
    const payload = this.patientAuthService.verifyToken(token);
    return this.patientAuthService.getAccount(payload.sub);
  }
}