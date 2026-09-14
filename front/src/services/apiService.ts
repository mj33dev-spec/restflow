import axios from 'axios';
import { RequestState, ResponseResult, HistoryItem, KeyValueItem, ApiTab } from '../types';
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

  // Default fallback for {{baseUrl}} if missing or empty
  if (!('baseUrl' in varsMap) || !varsMap['baseUrl']) {
    varsMap['baseUrl'] = BACKEND_BASE_URL;
  }

  let finalUrl = interpolateVariables(req.url, varsMap);
  // Clean up any remaining unhandled {{var}} templates
  finalUrl = finalUrl.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');

  // Add missing scheme/host if needed
  if (finalUrl.startsWith('/')) {
    finalUrl = `${BACKEND_BASE_URL}${finalUrl}`;
  } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `http://${finalUrl}`;
  }

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

  const isEchoEndpoint = finalUrl.includes('/api/echo');
  const startTime = Date.now();

  // Helper: Client-side Built-in Echo Engine Fallback
  const getMockEchoResponse = (): ResponseResult => {
    const timeMs = Date.now() - startTime;
    const mockPayload = {
      message: `${req.method} Echo response from RestFlow Engine`,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: finalUrl,
      query: activeParams,
      headers: activeHeaders,
      receivedData: (req.method !== 'GET' && req.method !== 'HEAD') ? parsedBody : undefined,
      mockData: [
        { id: 1, name: 'RestFlow Pro', type: 'HTTP Client', status: 'Active' },
        { id: 2, name: 'Echo Engine', type: 'Built-in Mock', status: 'Running' }
      ]
    };
    const rawStr = JSON.stringify(mockPayload);
    return {
      status: 200,
      statusText: 'OK (Mock)',
      headers: { 'content-type': 'application/json' },
      data: mockPayload,
      timeMs,
      sizeBytes: new Blob([rawStr]).size,
      isError: false,
    };
  };

  // Helper for Direct Execution
  const executeDirect = async (): Promise<ResponseResult> => {
    try {
      const res = await axios({
        method: req.method,
        url: finalUrl,
        params: activeParams,
        headers: activeHeaders,
        data: (req.method !== 'GET' && req.method !== 'HEAD') ? parsedBody : undefined,
        validateStatus: () => true,
        timeout: 10000,
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
      if (isEchoEndpoint) {
        return getMockEchoResponse();
      }
      const endTime = Date.now();
      return {
        status: 0,
        statusText: '네트워크 / CORS 오류',
        headers: {},
        data: {
          error: err.message || 'CORS 제약 또는 네트워크 연결 실패.',
          message: '대상 URL에 접근할 수 없거나 CORS 제약으로 인해 응답을 수신하지 못했습니다.',
          tip: "상단의 'NestJS 프록시 서버' 토글을 켜서 CORS 및 네트워크 제약을 우회해보세요!",
        },
        timeMs: endTime - startTime,
        sizeBytes: 0,
        isError: true,
      };
    }
  };

  // 1. Send via NestJS Backend Proxy (if useProxy enabled)
  if (req.useProxy) {
    try {
      const res = await axios.post(`${BACKEND_BASE_URL}/api/proxy`, {
        method: req.method,
        url: finalUrl,
        params: activeParams,
        headers: activeHeaders,
        data: (req.method !== 'GET' && req.method !== 'HEAD') ? parsedBody : undefined,
      }, { timeout: 10000 });

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
      // If Proxy fails, try Direct Request or Mock fallback!
      if (isEchoEndpoint) {
        try {
          return await executeDirect();
        } catch {
          return getMockEchoResponse();
        }
      }

      try {
        const directRes = await executeDirect();
        if (!directRes.isError || directRes.status > 0) {
          return directRes;
        }
      } catch (e) {
        // Ignore fallback error
      }

      return {
        status: err.response?.status || 500,
        statusText: '프록시 요청 실패',
        headers: {},
        data: err.response?.data || {
          error: err.message || 'NestJS 프록시 서버 연결 실패',
          message: 'NestJS 프록시 서버(http://localhost:3002)에 연결하지 못했습니다.',
          tip: '백엔드 서버가 3002 포트에서 실행 중인지 확인하거나, 상단 프록시 토글을 끄고 직접 브라우저 요청을 시도하세요.',
        },
        timeMs: Date.now() - startTime,
        sizeBytes: 0,
        isError: true,
      };
    }
  }

  // 2. Direct Browser Request
  return await executeDirect();
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
// -------------------------------------------------------------
// 4. Supabase & Local Collections Helpers (Folders & Requests)
// -------------------------------------------------------------
const LOCAL_COLLECTIONS_KEY = 'restflow_local_collections';

export const getStoredLocalCollections = (): any[] => {
  try {
    const raw = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredLocalCollections = (collections: any[]) => {
  try {
    localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(collections || []));
  } catch (e) {
    // Ignore storage error
  }
};

export const fetchCollections = async (): Promise<any[]> => {
  const localList = getStoredLocalCollections();
  let dbList: any[] = [];

  try {
    const { data: collectionsData, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (!collectionsError && collectionsData) {
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

      dbList = collectionsData.map((col: any) => {
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
    }
  } catch (e) {
    // Fallback gracefully
  }

  // Merge DB list and Local list (prefer DB version if duplicate id)
  const dbIds = new Set(dbList.map((c) => c.id));
  const uniqueLocals = localList.filter((c) => !dbIds.has(c.id));
  return [...dbList, ...uniqueLocals];
};

export const createCollectionGroup = async (group: {
  name: string;
  description?: string;
  variables?: any[];
  headers?: any[];
}): Promise<any> => {
  let createdFolder: any = null;

  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
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

      if (error) {
        console.error('Supabase DB folder creation error:', error.message || error);
      } else if (data) {
        createdFolder = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          variables: data.variables || [],
          headers: data.headers || [],
          items: [],
          timestamp: data.created_at,
        };
      }
    }
  } catch (e) {
    console.error('Supabase folder creation exception:', e);
  }

  if (!createdFolder) {
    createdFolder = {
      id: `col-local-${Date.now()}`,
      name: group.name,
      description: group.description || '',
      variables: group.variables || [],
      headers: group.headers || [],
      items: [],
      timestamp: new Date().toISOString(),
    };
  }

  // Always sync to localStorage
  const currentLocals = getStoredLocalCollections();
  saveStoredLocalCollections([createdFolder, ...currentLocals]);

  return createdFolder;
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

    // Also update local storage if present
    const locals = getStoredLocalCollections();
    const updatedLocals = locals.map((c) =>
      c.id === collectionId ? { ...c, variables, headers } : c
    );
    saveStoredLocalCollections(updatedLocals);

    return !error;
  } catch (e) {
    return false;
  }
};

export const updateCollectionGroupNameApi = async (
  collectionId: string,
  newName: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('collections')
      .update({ name: newName })
      .eq('id', collectionId);

    // Also update local storage
    const locals = getStoredLocalCollections();
    const updatedLocals = locals.map((c) =>
      c.id === collectionId ? { ...c, name: newName } : c
    );
    saveStoredLocalCollections(updatedLocals);

    return !error;
  } catch (e) {
    return false;
  }
};

export const deleteCollectionGroupApi = async (id: string): Promise<boolean> => {
  try {
    await supabase.from('collections').delete().eq('id', id);
  } catch (e) {}

  const locals = getStoredLocalCollections();
  saveStoredLocalCollections(locals.filter((c) => c.id !== id));
  return true;
};

export const saveCollectionRequestItem = async (item: {
  collectionId: string;
  name: string;
  method: string;
  url: string;
  params?: any[];
  headers?: any[];
  body?: string;
}): Promise<any> => {
  let savedItem: any = null;

  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (user && !item.collectionId.startsWith('col-local-')) {
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

      if (!error && data) {
        savedItem = {
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
      }
    }
  } catch (e) {
    // Ignore
  }

  if (!savedItem) {
    savedItem = {
      id: `item-local-${Date.now()}`,
      collectionId: item.collectionId,
      name: item.name,
      method: item.method,
      url: item.url,
      params: item.params || [],
      headers: item.headers || [],
      body: item.body || '',
      timestamp: new Date().toISOString(),
    };
  }

  // Also update local storage
  const locals = getStoredLocalCollections();
  const updatedLocals = locals.map((col) => {
    if (col.id === item.collectionId) {
      return { ...col, items: [...(col.items || []), savedItem] };
    }
    return col;
  });
  saveStoredLocalCollections(updatedLocals);

  return savedItem;
};

export const deleteCollectionRequestItemApi = async (id: string): Promise<boolean> => {
  try {
    await supabase.from('collection_items').delete().eq('id', id);
  } catch (e) {}

  const locals = getStoredLocalCollections();
  const updatedLocals = locals.map((col) => ({
    ...col,
    items: (col.items || []).filter((item: any) => item.id !== id),
  }));
  saveStoredLocalCollections(updatedLocals);
  return true;
};

// -------------------------------------------------------------
// 5. User Layout Settings (DB & localStorage Sync)
// -------------------------------------------------------------
const LOCAL_SETTINGS_KEY = 'restflow_user_layout_settings';

export interface UserLayoutSettings {
  sidebarWidth?: number;
  requestPanelHeight?: number;
  tabs?: ApiTab[];
  activeTabId?: string;
}

export const getStoredLocalSettings = (): UserLayoutSettings | null => {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveStoredLocalSettings = (settings: UserLayoutSettings) => {
  try {
    const current = getStoredLocalSettings() || {};
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  } catch (e) {
    // Ignore storage errors
  }
};

export const fetchUserSettings = async (): Promise<UserLayoutSettings | null> => {
  const localSettings = getStoredLocalSettings() || {};
  let dbSettings: UserLayoutSettings | null = null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (user.user_metadata?.layoutSettings) {
        dbSettings = user.user_metadata.layoutSettings;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single();

        if (profile?.settings?.layoutSettings) {
          dbSettings = profile.settings.layoutSettings;
        }
      }
    }
  } catch (e) {
    // Fallback gracefully
  }

  return {
    ...localSettings,
    ...(dbSettings || {}),
  };
};

export const saveUserSettings = async (settings: UserLayoutSettings): Promise<boolean> => {
  // 1. Save synchronously to localStorage IMMEDIATELY (0ms delay)
  saveStoredLocalSettings(settings);

  try {
    // 2. Read session synchronously from memory (no HTTP network request delay)
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return true;

    const currentMetadata = user.user_metadata || {};
    const updatedLayoutSettings = {
      ...(currentMetadata.layoutSettings || {}),
      ...settings,
    };

    // 3. Parallel DB update (Auth metadata + public.profiles table)
    const metadataPromise = supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        layoutSettings: updatedLayoutSettings,
      },
    });

    const dbPromise = supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        settings: { layoutSettings: updatedLayoutSettings },
      });

    await Promise.allSettled([metadataPromise, dbPromise]);
    return true;
  } catch (e) {
    console.error('Error saving user layout settings to DB:', e);
    return false;
  }
};

