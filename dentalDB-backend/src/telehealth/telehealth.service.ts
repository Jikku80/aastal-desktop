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
    const room = await this.videoProvider.createRoom(appointmentId);
    return { roomUrl: (appt as any).videoRoomUrl || room.roomUrl, token: room.guestToken };
  }

  async getStaffToken(appointmentId: string, userId: string) {
    const appt = await this.apptRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    const room = await this.videoProvider.createRoom(appointmentId);
    return { roomUrl: (appt as any).videoRoomUrl || room.roomUrl, token: room.hostToken };
  }
}
