import { Injectable } from '@nestjs/common';

export interface HistoryItem {
  id: string;
  method: string;
  url: string;
  status?: number;
  timeMs?: number;
  timestamp: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
}

@Injectable()
export class HistoryService {
  private historyList: HistoryItem[] = [
    {
      id: 'sample-1',
      method: 'GET',
      url: 'http://localhost:3001/api/echo?sample=true',
      status: 200,
      timeMs: 24,
      timestamp: new Date().toISOString(),
      params: { sample: 'true' }
    },
    {
      id: 'sample-2',
      method: 'POST',
      url: 'http://localhost:3001/api/echo',
      status: 200,
      timeMs: 45,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      body: '{\n  "name": "RestFlow Demo",\n  "action": "Sending POST Data"\n}'
    }
  ];

  getHistory(): HistoryItem[] {
    return this.historyList;
  }

  addHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
    const newItem: HistoryItem = {
      ...item,
      id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
    };
    // Keep top 50 items
    this.historyList.unshift(newItem);
    if (this.historyList.length > 50) {
      this.historyList = this.historyList.slice(0, 50);
    }
    return newItem;
  }

  deleteHistoryItem(id: string): boolean {
    const initialLen = this.historyList.length;
    this.historyList = this.historyList.filter(h => h.id !== id);
    return this.historyList.length < initialLen;
  }

  clearHistory(): boolean {
    this.historyList = [];
    return true;
  }
}
