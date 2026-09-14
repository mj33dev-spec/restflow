import axios from 'axios';
import { RequestState, ResponseResult, HistoryItem } from '../types';
import { supabase } from './supabaseClient';

const BACKEND_BASE_URL = 'http://localhost:3002';

// -------------------------------------------------------------
// 1. HTTP Request Execution
// -------------------------------------------------------------
export const executeHttpRequest = async (req: RequestState): Promise<ResponseResult> => {
  const activeParams: Record<string, string> = {};
  req.params.filter(p => p.enabled && p.key.trim()).forEach(p => {
    activeParams[p.key.trim()] = p.value;
  });

  const activeHeaders: Record<string, string> = {};
  req.headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
    activeHeaders[h.key.trim()] = h.value;
  });

  let parsedBody: any = req.body;
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && req.bodyType === 'json') {
    try {
      parsedBody = JSON.parse(req.body);
    } catch (e) {
      // Keep as string if raw or invalid JSON
    }
  }

  // Send via NestJS Backend Proxy (bypasses CORS)
  if (req.useProxy) {
    try {
      const res = await axios.post(`${BACKEND_BASE_URL}/api/proxy`, {
        method: req.method,
        url: req.url,
        params: activeParams,
        headers: activeHeaders,
        data: (req.method !== 'GET' && req.method !== 'HEAD') ? parsedBody : undefined,
      });

      return {
        status: res.data.status,
        statusText: res.data.statusText,
        headers: res.data.headers || {},
        data: res.data.data,
        timeMs: res.data.timeMs,
        sizeBytes: res.data.sizeBytes,
        isError: res.data.status >= 400,
      };
    } catch (err: any) {
      return {
        status: err.response?.status || 500,
        statusText: '프록시 요청 실패',
        headers: {},
        data: err.response?.data || { error: err.message || 'NestJS 프록시 서버 연결에 실패했습니다.' },
        timeMs: 0,
        sizeBytes: 0,
        isError: true,
      };
    }
  }

  // Direct Browser Request
  const startTime = Date.now();
  try {
    const res = await axios({
      method: req.method,
      url: req.url,
      params: activeParams,
      headers: activeHeaders,
      data: (req.method !== 'GET' && req.method !== 'HEAD') ? parsedBody : undefined,
      validateStatus: () => true,
    });
    const endTime = Date.now();
    const rawStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data || {});
    
    return {
      status: res.status,
      statusText: res.statusText || 'OK',
      headers: res.headers as Record<string, string>,
      data: res.data,
      timeMs: endTime - startTime,
      sizeBytes: new Blob([rawStr]).size,
      isError: res.status >= 400,
    };
  } catch (err: any) {
    const endTime = Date.now();
    return {
      status: 0,
      statusText: '네트워크 / CORS 오류',
      headers: {},
      data: {
        error: err.message || 'CORS 제약 또는 네트워크 연결 실패.',
        tip: "상단의 'NestJS 프록시 서버' 토글을 켜서 CORS 제약을 우회해보세요!",
      },
      timeMs: endTime - startTime,
      sizeBytes: 0,
      isError: true,
    };
  }
};

// -------------------------------------------------------------
// 2. Supabase Auth Helpers
// -------------------------------------------------------------
export const signUpWithEmail = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) throw error;
  return data;
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

export const onAuthChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
};

// -------------------------------------------------------------
// 3. Supabase History Helpers (Anonymous & Registered)
// -------------------------------------------------------------
export const fetchHistory = async (): Promise<HistoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      method: item.method,
      url: item.url,
      status: item.status,
      timeMs: item.time_ms,
      timestamp: item.created_at,
      headers: item.headers,
      params: item.params,
      body: item.body,
    }));
  } catch (e) {
    return [];
  }
};

export const saveHistory = async (item: {
  method: string;
  url: string;
  status?: number;
  timeMs?: number;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
}): Promise<HistoryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('history')
      .insert([
        {
          method: item.method,
          url: item.url,
          status: item.status,
          time_ms: item.timeMs,
          headers: item.headers || null,
          params: item.params || null,
          body: item.body || null,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      method: data.method,
      url: data.url,
      status: data.status,
      timeMs: data.time_ms,
      timestamp: data.created_at,
      headers: data.headers,
      params: data.params,
      body: data.body,
    };
  } catch (e) {
    return null;
  }
};

export const clearHistoryApi = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    return !error;
  } catch (e) {
    return false;
  }
};

export const deleteHistoryItemApi = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('history')
      .delete()
      .eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
};

// -------------------------------------------------------------
// 4. Supabase Collections Helpers (User-Scoped)
// -------------------------------------------------------------
export const fetchCollections = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      method: item.method,
      url: item.url,
      params: item.params || [],
      headers: item.headers || [],
      body: item.body || '',
      timestamp: item.created_at,
    }));
  } catch (e) {
    return [];
  }
};

export const saveCollectionItem = async (item: {
  name: string;
  description?: string;
  method: string;
  url: string;
  params?: any[];
  headers?: any[];
  body?: string;
}): Promise<any | null> => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('collections')
      .insert([
        {
          user_id: user.id,
          name: item.name,
          description: item.description || null,
          method: item.method,
          url: item.url,
          params: item.params || [],
          headers: item.headers || [],
          body: item.body || null,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase save collection error:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      method: data.method,
      url: data.url,
      params: data.params || [],
      headers: data.headers || [],
      body: data.body || '',
      timestamp: data.created_at,
    };
  } catch (e) {
    console.error('Error saving collection to Supabase:', e);
    return null;
  }
};

export const deleteCollectionItemApi = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
};
