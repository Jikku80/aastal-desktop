import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      driver: this.config.get('DB_DRIVER', 'postgres'),
      time: new Date().toISOString(),
    };
  }
}
