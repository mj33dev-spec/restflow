import { Module } from '@nestjs/common';
import { EchoController } from './echo/echo.controller';
import { ProxyController } from './proxy/proxy.controller';
import { ProxyService } from './proxy/proxy.service';
import { HistoryController } from './history/history.controller';
import { HistoryService } from './history/history.service';

@Module({
  imports: [],
  controllers: [EchoController, ProxyController, HistoryController],
  providers: [ProxyService, HistoryService],
})
export class AppModule {}
