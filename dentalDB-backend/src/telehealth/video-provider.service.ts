import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface VideoRoom {
  roomId: string;
  roomUrl: string;
  hostToken: string;
  guestToken: string;
  provider: string;
  expiresAt: Date;
}

/**
 * Abstracted video provider service.
 * Swap implementation by changing TELEHEALTH_PROVIDER env var.
 * Currently: stub that generates deterministic room URLs for development.
 * Production: set TELEHEALTH_PROVIDER=daily|twilio and provide API keys.
 */
@Injectable()
export class VideoProviderService {
  private readonly logger = new Logger(VideoProviderService.name);
  private readonly provider = process.env.TELEHEALTH_PROVIDER || 'stub';

  async createRoom(appointmentId: string): Promise<VideoRoom> {
    if (this.provider === 'daily') {
      return this.createDailyRoom(appointmentId);
    }
    // Stub — usable for dev without a real provider key
    return this.createStubRoom(appointmentId);
  }

  private createStubRoom(appointmentId: string): VideoRoom {
    const roomId = `room-${appointmentId.slice(0, 8)}`;
    const base = process.env.APP_URL || 'https://app.dentalos.io';
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 h
    const hostToken = crypto.randomBytes(24).toString('hex');
    const guestToken = crypto.randomBytes(24).toString('hex');
    this.logger.warn(`[STUB] Video room created: ${roomId} — replace VideoProviderService for production`);
    return {
      roomId,
      roomUrl: `${base}/video/${roomId}`,
      hostToken,
      guestToken,
      provider: 'stub',
      expiresAt,
    };
  }

  private async createDailyRoom(appointmentId: string): Promise<VideoRoom> {
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) throw new Error('DAILY_API_KEY not configured');

    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `appt-${appointmentId.slice(0, 8)}`,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 7200,
          enable_recording: false,
          enable_chat: true,
          enable_screenshare: false,
        },
      }),
    });
    const room = await res.json() as any;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    // Mint meeting tokens
    const mintToken = async (isOwner: boolean) => {
      const r = await fetch('https://api.daily.co/v1/meeting-tokens', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { room_name: room.name, is_owner: isOwner, exp: Math.floor(expiresAt.getTime() / 1000) } }),
      });
      return ((await r.json()) as any).token;
    };

    const [hostToken, guestToken] = await Promise.all([mintToken(true), mintToken(false)]);
    return { roomId: room.name, roomUrl: room.url, hostToken, guestToken, provider: 'daily', expiresAt };
  }
}
