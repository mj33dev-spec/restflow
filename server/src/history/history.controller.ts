import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { HistoryService, HistoryItem } from './history.service';

@Controller('api/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  getHistory() {
    return this.historyService.getHistory();
  }

  @Post()
  addHistory(@Body() item: Omit<HistoryItem, 'id' | 'timestamp'>) {
    return this.historyService.addHistoryItem(item);
  }

  @Delete(':id')
  deleteHistoryItem(@Param('id') id: string) {
    return { success: this.historyService.deleteHistoryItem(id) };
  }

  @Delete()
  clearHistory() {
    return { success: this.historyService.clearHistory() };
  }
}
