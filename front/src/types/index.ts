export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestState {
  method: HttpMethod;
  url: string;
  params: KeyValueItem[];
  headers: KeyValueItem[];
  variables: KeyValueItem[];
  bodyType: 'json' | 'raw';
  body: string;
  useProxy: boolean;
}

export interface ResponseResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  timeMs: number;
  sizeBytes: number;
  isError?: boolean;
}

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

export interface CollectionRequestItem {
  id: string;
  collectionId: string;
  name: string;
  method: HttpMethod;
  url: string;
  params?: KeyValueItem[];
  headers?: KeyValueItem[];
  body?: string;
  timestamp: string;
}

export interface CollectionGroup {
  id: string;
  name: string;
  description?: string;
  variables: KeyValueItem[];
  headers: KeyValueItem[];
  items: CollectionRequestItem[];
  timestamp: string;
}
