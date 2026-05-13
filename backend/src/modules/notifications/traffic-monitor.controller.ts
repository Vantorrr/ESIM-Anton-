import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAdminGuard } from '@/common/auth/jwt-user.guard';
import { TrafficMonitorService } from './traffic-monitor.service';

@ApiTags('traffic-monitor')
@ApiBearerAuth()
@UseGuards(JwtAdminGuard)
@Controller('traffic-monitor')
export class TrafficMonitorController {
  private readonly logger = new Logger(TrafficMonitorController.name);

  constructor(private readonly trafficMonitorService: TrafficMonitorService) {}

  @Post('trigger-traffic')
  @ApiOperation({ summary: 'Принудительный запуск мониторинга трафика' })
  async triggerTrafficMonitor() {
    this.logger.log('Manual trigger for monitorTrafficLevels');
    this.trafficMonitorService.monitorTrafficLevels().catch(err => {
      this.logger.error('Error in manual monitorTrafficLevels: ' + err.message);
    });
    return { success: true, message: 'Мониторинг остатков трафика запущен в фоне' };
  }

  @Post('trigger-expiry')
  @ApiOperation({ summary: 'Принудительный запуск мониторинга истечения сроков eSIM' })
  async triggerExpiryMonitor() {
    this.logger.log('Manual trigger for monitorExpiringEsims');
    this.trafficMonitorService.monitorExpiringEsims().catch(err => {
      this.logger.error('Error in manual monitorExpiringEsims: ' + err.message);
    });
    return { success: true, message: 'Мониторинг сроков eSIM запущен в фоне' };
  }
}
