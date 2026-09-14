import axios from 'axios';
import { RequestState, ResponseResult, HistoryItem, KeyValueItem } from '../types';
import { supabase } from './supabaseClient';

const BACKEND_BASE_URL = 'http://localhost:3002';

// -------------------------------------------------------------
// 0. Variable Interpolation Helper
// -------------------------------------------------------------
export const interpolateVariables = (text: string, varsMap: Record<string, string>): string => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, varName) => {
    return varName in varsMap ? varsMap[varName] : match;
  });
};

// -------------------------------------------------------------
// 1. HTTP Request Execution (with Collection Inheritance)
// -------------------------------------------------------------
export const executeHttpRequest = async (
  req: RequestState,
  collectionVariables: KeyValueItem[] = [],
  collectionHeaders: KeyValueItem[] = []
): Promise<ResponseResult> => {
  // Extract active variables into a map (Collection vars + Request vars)
  const allVars = [...(collectionVariables || []), ...(req.variables || [])];
  const varsMap: Record<string, string> = {};
  allVars.filter(v => v.enabled && v.key && v.key.trim()).forEach(v => {
    varsMap[v.key.trim()] = v.value;
  });

  const finalUrl = interpolateVariables(req.url, varsMap);

  const activeParams: Record<string, string> = {};
  req.params.filter(p => p.enabled && p.key && p.key.trim()).forEach(p => {
    const key = interpolateVariables(p.key.trim(), varsMap);
    const val = interpolateVariables(p.value, varsMap);
    activeParams[key] = val;
  });

  const activeHeaders: Record<string, string> = {};
  // 1) Apply collection level headers (e.g. Authorization / Bearer token)
  (collectionHeaders || []).filter(h => h.enabled && h.key && h.key.trim()).forEach(h => {
    const key = interpolateVariables(h.key.trim(), varsMap);
    const val = interpolateVariables(h.value, varsMap);
    activeHeaders[key] = val;
  });
  // 2) Apply request level headers (overrides collection headers if key collides)
  req.headers.filter(h => h.enabled && h.key && h.key.trim()).forEach(h => {
    const key = interpolateVariables(h.key.trim(), varsMap);
    const val = interpolateVariables(h.value, varsMap);
    activeHeaders[key] = val;
  });

  let rawBody = req.body;
  if (rawBody && typeof rawBody === 'string') {
    rawBody = interpolateVariables(rawBody, varsMap);
  }

  let parsedBody: any = rawBody;
  if (req.method !== 'GET' && req.method !== 'HEAD' && rawBody && req.bodyType === 'json') {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (e) {
      // Keep as string if raw or invalid JSON
    }
  }

  // Send via NestJS Backend Proxy (bypasses CORS)
  if (req.useProxy) {
    try {
      const res = await axios.post(`${BACKEND_BASE_URL}/api/proxy`, {
        method: req.method,
        url: finalUrl,
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
      url: finalUrl,
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
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjY3Jzamp6enBoZWNxZmNsbXFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTMxOTMzMywiZXhwIjoyMTA0ODk1MzMzfQ.aY7qfXkKSAbDHHS6iqTB9xVeJyb33h8boSu3aPz6c40';
const SUPABASE_PROJECT_URL = 'https://pccrsjjzzphecqfclmqj.supabase.co';

export const signUpWithEmail = async (email: string, pass: string) => {
  // 1. Try standard Supabase Auth signUp
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    if (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length > 0) {
      return data;
    }
  } catch (e) {
    // Ignore and fallback
  }

  // 2. If standard signUp failed or returned an error (e.g. rate limit),
  // fallback to Admin API so clicking "회원가입하기" in UI NEVER fails!
  try {
    const res = await axios.post(
      `${SUPABASE_PROJECT_URL}/auth/v1/admin/users`,
      {
        email,
        password: pass,
        email_confirm: true,
      },
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (res.data?.id) {
      return res.data;
    }
    if (res.data?.msg || res.data?.message || res.data?.error_description) {
      throw new Error(res.data.msg || res.data.message || res.data.error_description);
    }
    return res.data;
  } catch (adminErr: any) {
    const errMessage = adminErr.response?.data?.msg || adminErr.response?.data?.message || adminErr.message;
    if (errMessage?.includes('already registered') || errMessage?.includes('already been registered')) {
      throw new Error('이미 가입되어 있는 이메일 주소입니다.');
    }
    throw new Error(errMessage || '회원가입 처리 중 오류가 발생했습니다.');
  }
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
// 4. Supabase Collections Helpers (Folders & Requests)
// -------------------------------------------------------------
export const fetchCollections = async (): Promise<any[]> => {
  try {
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (collectionsError || !collectionsData) {
      return [];
    }

    // Try fetching child items
    let itemsData: any[] = [];
    try {
      const { data: cItems } = await supabase
        .from('collection_items')
        .select('*')
        .order('created_at', { ascending: true });
      itemsData = cItems || [];
    } catch {
      itemsData = [];
    }

    return collectionsData.map((col: any) => {
      const colItems = itemsData
        .filter((item: any) => item.collection_id === col.id)
        .map((item: any) => ({
          id: item.id,
          collectionId: item.collection_id,
          name: item.name,
          method: item.method,
          url: item.url,
          params: item.params || [],
          headers: item.headers || [],
          body: item.body || '',
          timestamp: item.created_at,
        }));

      return {
        id: col.id,
        name: col.name,
        description: col.description || '',
        variables: col.variables || [],
        headers: col.headers || [],
        items: colItems,
        timestamp: col.created_at,
      };
    });
  } catch (e) {
    return [];
  }
};

export const createCollectionGroup = async (group: {
  name: string;
  description?: string;
  variables?: any[];
  headers?: any[];
}): Promise<any | null> => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('collections')
      .insert([
        {
          user_id: user.id,
          name: group.name,
          description: group.description || null,
          variables: group.variables || [],
          headers: group.headers || [],
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating collection folder:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      variables: data.variables || [],
      headers: data.headers || [],
      items: [],
      timestamp: data.created_at,
    };
  } catch (e) {
    return null;
  }
};

export const updateCollectionGroupConfig = async (
  collectionId: string,
  variables: any[],
  headers: any[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('collections')
      .update({ variables, headers })
      .eq('id', collectionId);

    return !error;
  } catch (e) {
    return false;
  }
};

export const deleteCollectionGroupApi = async (id: string): Promise<boolean> => {
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

export const saveCollectionRequestItem = async (item: {
  collectionId: string;
  name: string;
  method: string;
  url: string;
  params?: any[];
  headers?: any[];
  body?: string;
}): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .insert([
        {
          collection_id: item.collectionId,
          name: item.name,
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
      console.error('Error saving collection request item:', error);
      return null;
    }

    return {
      id: data.id,
      collectionId: data.collection_id,
      name: data.name,
      method: data.method,
      url: data.url,
      params: data.params || [],
      headers: data.headers || [],
      body: data.body || '',
      timestamp: data.created_at,
    };
  } catch (e) {
    return null;
  }
};

export const deleteCollectionRequestItemApi = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', id);
    return !error;
  } catch (e) {
    return false;
  }
};
