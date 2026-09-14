import { Controller, Post, Body } from '@nestjs/common';
import { ProxyService, ProxyRequestDto } from './proxy.service';

@Controller('api/proxy')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post()
  async handleProxy(@Body() dto: ProxyRequestDto) {
    return this.proxyService.executeProxyRequest(dto);
  }
}
