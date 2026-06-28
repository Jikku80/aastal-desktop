import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('discovery')
@SkipThrottle()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('clinics/nearby')
  async getNearbyClinics(@Query() q: any) {
    return this.discoveryService.findNearbyClinics({
      lat:              q.lat !== undefined ? parseFloat(q.lat) : undefined,
      lng:              q.lng !== undefined ? parseFloat(q.lng) : undefined,
      radiusKm:         q.radiusKm ? parseFloat(q.radiusKm) : 20,
      category:         q.category,
      search:           q.search,
      acceptsInsurance: q.acceptsInsurance === 'true',
      openNow:          q.openNow === 'true',
      minRating:        q.minRating ? parseFloat(q.minRating) : undefined,
      sort:             q.sort || 'distance',
      page:             q.page ? parseInt(q.page) : 1,
      limit:            q.limit ? parseInt(q.limit) : 20,
    });
  }

  @Get('clinics/:slug')
  async getClinicProfile(@Param('slug') slug: string) {
    const result = await this.discoveryService.getClinicProfile(slug);
    if (!result) throw new NotFoundException('Clinic not found');
    return result;
  }

  @Get('doctors/nearby')
  async getNearbyDoctors(@Query() q: any) {
    return this.discoveryService.findNearbyDoctors({
      lat:              q.lat !== undefined ? parseFloat(q.lat) : undefined,
      lng:              q.lng !== undefined ? parseFloat(q.lng) : undefined,
      radiusKm:         q.radiusKm ? parseFloat(q.radiusKm) : 20,
      specialization:   q.specialization,
      consultationType: q.consultationType,
      availableToday:   q.availableToday === 'true',
      sort:             q.sort || 'distance',
      page:             q.page ? parseInt(q.page) : 1,
      limit:            q.limit ? parseInt(q.limit) : 20,
    });
  }

  @Get('doctors/:doctorId')
  async getDoctorProfile(@Param('doctorId') doctorId: string) {
    const result = await this.discoveryService.getDoctorProfile(doctorId);
    if (!result) throw new NotFoundException('Doctor not found');
    return result;
  }

  @Get('services/compare')
  async compareServices(@Query() q: any) {
    return this.discoveryService.compareServices({
      category: q.category,
      lat:      q.lat !== undefined ? parseFloat(q.lat) : undefined,
      lng:      q.lng !== undefined ? parseFloat(q.lng) : undefined,
      radiusKm: q.radiusKm ? parseFloat(q.radiusKm) : 20,
    });
  }
}
