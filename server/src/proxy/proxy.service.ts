import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

export interface ProxyRequestDto {
  method: string;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  data?: any;
}

@Injectable()
export class ProxyService {
  async executeProxyRequest(dto: ProxyRequestDto) {
    const startTime = Date.now();
    const { method, url, headers = {}, params = {}, data } = dto;

    const cleanHeaders = { ...headers };
    // Remove host header if exists to avoid host mismatches on proxying
    delete cleanHeaders['host'];
    delete cleanHeaders['Host'];

    const config: AxiosRequestConfig = {
      method: method as any,
      url,
      headers: cleanHeaders,
      params,
      data: method !== 'GET' ? data : undefined,
      validateStatus: () => true, // Don't throw on HTTP error status codes (4xx, 5xx)
      timeout: 15000,
    };

    try {
      const response = await axios(config);
      const endTime = Date.now();
      const timeMs = endTime - startTime;

      const rawString = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data || {});
      const sizeBytes = Buffer.byteLength(rawString, 'utf8');

      return {
        success: true,
        status: response.status,
        statusText: response.statusText || 'OK',
        headers: response.headers,
        data: response.data,
        timeMs,
        sizeBytes,
      };
    } catch (error: any) {
      const endTime = Date.now();
      return {
        success: false,
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'Internal Server / Network Error',
        headers: error.response?.headers || {},
        data: error.response?.data || { error: error.message || 'Failed to connect to target URL' },
        timeMs: endTime - startTime,
        sizeBytes: 0,
      };
    }
  }
}
