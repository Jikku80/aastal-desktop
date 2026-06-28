import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * SparrowSMS service — Nepal's most widely used bulk SMS provider.
 *
 * Required env vars:
 *   SPARROW_SMS_TOKEN   — your Sparrow SMS API token
 *   SPARROW_SMS_FROM    — sender identity (e.g. "CLNICKAR") max 11 chars
 *
 * Docs: https://sparrowsms.com/api-docs
 */
@Injectable()
export class SparrowSmsService {
  private readonly logger = new Logger(SparrowSmsService.name);
  private readonly apiUrl = 'http://api.sparrowsms.com/v2/sms/';

  constructor(
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private get token(): string | undefined {
    return this.config.get<string>('SPARROW_SMS_TOKEN');
  }

  private get from(): string {
    return this.config.get<string>('SPARROW_SMS_FROM', 'ClinicKB');
  }

  /** Normalize a Nepali phone number to 10-digit local format (98XXXXXXXX) */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('977') && digits.length === 13) return digits.slice(3);
    if (digits.startsWith('0') && digits.length === 11) return digits.slice(1);
    return digits;
  }

  /**
   * Send an SMS via Sparrow SMS.
   * Returns true if sent successfully, false if skipped/failed.
   */
  async send(to: string, message: string): Promise<boolean> {
    if (!this.token) {
      this.logger.warn('SPARROW_SMS_TOKEN not set — skipping SMS');
      return false;
    }

    const normalized = this.normalizePhone(to);

    if (normalized.length !== 10) {
      this.logger.warn(`SparrowSMS: invalid phone number "${to}" → "${normalized}"`);
      return false;
    }

    try {
      const params = {
        token: this.token,
        from: this.from,
        to: normalized,
        text: message,
      };

      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, { params }),
      );

      // Sparrow returns { response_code: 200, message: "success", ... }
      if (response.data?.response_code === 200) {
        this.logger.log(`SparrowSMS sent to ${normalized}`);
        return true;
      } else {
        this.logger.warn(
          `SparrowSMS non-200 response for ${normalized}: ${JSON.stringify(response.data)}`,
        );
        return false;
      }
    } catch (e: any) {
      this.logger.error(`SparrowSMS failed for ${normalized}: ${e?.message}`);
      return false;
    }
  }

  /** Convenience: send and swallow errors (fire-and-forget) */
  async sendSafe(to: string, message: string): Promise<void> {
    try {
      await this.send(to, message);
    } catch {
      // already logged in send()
    }
  }
}
