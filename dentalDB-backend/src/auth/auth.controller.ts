import {
  Controller, Post, Get, Body, Request, Response,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request as Req, Response as Res } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 5 attempts per minute — tight enough to stop brute-force, loose enough
  // for legitimate users who mistype their password a couple of times.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Response({ passthrough: true }) res: Res) {
    return this.authService.register(dto, res);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Response({ passthrough: true }) res: Res) {
    return this.authService.login(dto, res);
  }

  // 10 per minute — token refresh is called silently in the background,
  // so needs a little more headroom than login.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Request() req: Req, @Response({ passthrough: true }) res: Res) {
    return this.authService.refresh(req, res);
  }

  // 3 per hour — prevents email flooding / enumeration abuse.
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  // Authenticated endpoints — skip the global throttler entirely.
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Request() req: Req, @Response({ passthrough: true }) res: Res) {
    return this.authService.logout(req.user['id'], res);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: Req) {
    return this.authService.me(req.user['id']);
  }

  @SkipThrottle()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body('token')    token:    string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }

  /**
   * Part 0.3 — Independent doctor self-signup.
   * Creates a User with role=DOCTOR, clinicId=NULL, zero affiliations.
   * OTP verification must be completed separately via patient-auth OTP flow
   * or a dedicated doctor OTP flow wired to NotificationsService.sendSms/sendEmail.
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })

  @Post('doctor-otp/send')
  sendDoctorOtp(@Body('email') email: string) {
    if (!email) throw new (require('@nestjs/common').BadRequestException)('Email required');
    return this.authService.sendDoctorOtp(email);
  }

  @Post('doctor-otp/verify')
  verifyDoctorOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyDoctorOtp(body.email, body.otp);
  }

  @Post('doctor-signup')
  doctorSignup(
    @Body() body: { firstName: string; lastName: string; email: string; password: string; phone?: string },
    @Response({ passthrough: true }) res: Res,
  ) {
    return this.authService.doctorSignup(body, res);
  }
}
