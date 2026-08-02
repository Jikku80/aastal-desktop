import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { VideoProviderService } from './video-provider.service';

@Injectable()
export class TelehealthService {
  constructor(
    @InjectRepository(Appointment) private apptRepo: Repository<Appointment>,
    private readonly videoProvider: VideoProviderService,
  ) {}

  async createRoomForAppointment(appointmentId: string): Promise<{ roomUrl: string; guestToken: string; hostToken: string }> {
    const appt = await this.apptRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if ((appt as any).consultationType !== 'video') throw new BadRequestException('Not a video appointment');

    // Reuse if room already created
    if ((appt as any).videoRoomUrl) {
      return {
        roomUrl: (appt as any).videoRoomUrl,
        guestToken: '',
        hostToken: '',
      };
    }

    const room = await this.videoProvider.createRoom(appointmentId);
    await this.apptRepo.update(appointmentId, {
      videoRoomUrl: room.roomUrl,
      videoRoomId: room.roomId,
    } as any);

    return { roomUrl: room.roomUrl, guestToken: room.guestToken, hostToken: room.hostToken };
  }

  async getPatientToken(appointmentId: string, patientAccountId: string) {
    const appt = await this.apptRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    // In production: verify patientAccountId matches appointment.patientId

    // If a room already exists for this appointment, mint a fresh token for
    // THAT room rather than calling createRoom() again — see the comment on
    // VideoProviderService.mintToken() for why calling createRoom() here
    // unconditionally used to hand out tokens for a brand-new, unrelated
    // room on every join click.
    const existingRoomId = (appt as any).videoRoomId;
    if ((appt as any).videoRoomUrl && existingRoomId) {
      const token = await this.videoProvider.mintToken(existingRoomId, false);
      return { roomUrl: (appt as any).videoRoomUrl, token };
    }

    const room = await this.videoProvider.createRoom(appointmentId);
    await this.apptRepo.update(appointmentId, {
      videoRoomUrl: room.roomUrl,
      videoRoomId: room.roomId,
    } as any);
    return { roomUrl: room.roomUrl, token: room.guestToken };
  }

  async getStaffToken(appointmentId: string, userId: string) {
    const appt = await this.apptRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    const existingRoomId = (appt as any).videoRoomId;
    if ((appt as any).videoRoomUrl && existingRoomId) {
      const token = await this.videoProvider.mintToken(existingRoomId, true);
      return { roomUrl: (appt as any).videoRoomUrl, token };
    }

    const room = await this.videoProvider.createRoom(appointmentId);
    await this.apptRepo.update(appointmentId, {
      videoRoomUrl: room.roomUrl,
      videoRoomId: room.roomId,
    } as any);
    return { roomUrl: room.roomUrl, token: room.hostToken };
  }
}
