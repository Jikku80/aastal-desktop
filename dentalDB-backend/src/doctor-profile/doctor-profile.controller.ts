import { Controller, Get, Patch, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { DoctorProfileService } from './doctor-profile.service';

@Controller('doctor')
export class DoctorProfileController {
  constructor(private readonly service: DoctorProfileService) {}

  @Get('profile/:userId')
  getProfile(@Param('userId') userId: string) {
    return this.service.getOrCreate(userId);
  }

  @Patch('profile/:userId')
  updateProfile(@Param('userId') userId: string, @Body() body: any) {
    return this.service.update(userId, body);
  }

  @Post('profile/:userId/heartbeat')
  heartbeat(@Param('userId') userId: string) {
    return this.service.updateHeartbeat(userId);
  }

  @Get(':userId/locations')
  getLocations(@Param('userId') userId: string) {
    return this.service.getLocations(userId);
  }

  @Post(':userId/locations')
  addLocation(@Param('userId') userId: string, @Body() body: any) {
    return this.service.addLocation(userId, body);
  }

  @Delete(':userId/locations/:id')
  removeLocation(@Param('userId') userId: string, @Param('id') id: string) {
    return this.service.removeLocation(id, userId);
  }

  @Get(':userId/availability')
  getAvailability(@Param('userId') userId: string) {
    return this.service.getAvailability(userId);
  }

  @Post(':userId/availability')
  setAvailability(@Param('userId') userId: string, @Body() body: { slots: any[] }) {
    return this.service.setAvailability(userId, body.slots);
  }

  @Delete(':userId/availability/:id')
  deleteAvailability(@Param('userId') userId: string, @Param('id') id: string) {
    return this.service.deleteAvailability(id, userId);
  }
}
