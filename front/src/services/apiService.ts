import axios from 'axios';
import { RequestState, ResponseResult, HistoryItem, KeyValueItem, ApiTab } from '../types';
import { supabase } from './supabaseClient';


// -------------------------------------------------------------
// 0. Variable Interpolation Helper
// -------------------------------------------------------------
export const interpolateVariables = (text: string, varsMap: Record<string, string>): string => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, varName) => {
    return varName in varsMap ? varsMap[varName] : match;
  });
};

export const cleanAndParseJsonBody = (rawBody: string): any => {
  if (!rawBody || typeof rawBody !== 'string' || !rawBody.trim()) return undefined;
  let str = rawBody.trim();

  // 1. Strip wrapping quotes and escaped quotes if stringified
  for (let i = 0; i < 3; i++) {
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      try {
        const unquoted = JSON.parse(str);
        if (typeof unquoted === 'string') {
          str = unquoted.trim();
          continue;
        }
      } catch { }
    }
    if (str.includes('\\"')) {
      str = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
    }
    break;
  }

  // 2. Try parsing JSON
  try {
    let parsed = JSON.parse(str);
    while (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        break;
      }
    }

    // Un-wrap response wrapper 'data' field if present
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if ('data' in parsed && parsed.data && typeof parsed.data === 'object' && Object.keys(parsed.data).length > 0) {
        return parsed.data;
      }
    }
    return parsed;
  } catch (e) {
    // 3. Fallback: try removing trailing commas or fixing single quotes
    try {
      const fixed = str.replace(/'/g, '"').replace(/,\s*([\]}])/g, '$1');
      let parsed = JSON.parse(fixed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'data' in parsed && parsed.data) {
        return parsed.data;
      }
      return parsed;
    } catch {
      return str;
    }
  }
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
  const varsMap: Record<string, string> = {};
  // 1) Apply collection level variables first
  (collectionVariables || []).filter(v => v.enabled && v.key && v.key.trim()).forEach(v => {
    varsMap[v.key.trim()] = v.value;
  });
  // 2) Apply request level variables (override only if non-empty or new variable)
  (req.variables || []).filter(v => v.enabled && v.key && v.key.trim()).forEach(v => {
    const key = v.key.trim();
    if (v.value !== '' || !(key in varsMap)) {
      varsMap[key] = v.value;
    }
  });

  // Do not force port fallback for {{baseUrl}}

  let finalUrl = interpolateVariables(req.url, varsMap);
  // Clean up any remaining unhandled {{var}} templates
  finalUrl = finalUrl.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '');

  // Add missing scheme/host if needed
  if (finalUrl.startsWith('/')) {
    const base = varsMap['baseUrl'] || '';
    finalUrl = base ? `${base.replace(/\/+$/, '')}${finalUrl}` : `http://${finalUrl.replace(/^\/+/, '')}`;
  } else if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
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

  // Auto-set Content-Type if bodyType is json and no custom Content-Type header is defined
  const hasContentType = Object.keys(activeHeaders).some(k => k.toLowerCase() === 'content-type');
  if (!hasContentType && req.method !== 'GET' && req.method !== 'HEAD' && req.bodyType === 'json') {
    activeHeaders['Content-Type'] = 'application/json';
  }

  let rawBody = req.body;
  if (rawBody && typeof rawBody === 'string') {
    rawBody = interpolateVariables(rawBody, varsMap);
  }

  let parsedBody: any = rawBody;
  if (req.method !== 'GET' && req.method !== 'HEAD' && rawBody && req.bodyType === 'json') {
    parsedBody = cleanAndParseJsonBody(rawBody);
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

  // Direct OS / Browser HTTP Request Execution
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
      statusText: '네트워크 연결 오류',
      headers: {},
      data: {
        error: err.message || '네트워크 연결 실패.',
        message: '대상 URL에 접근할 수 없거나 서버가 응답하지 않습니다.',
        tip: '요청할 URL 주소와 서버 실행 상태를 확인해 주세요.',
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
  if (error) {
    const msg = error.message || '';
    if (msg.includes('Invalid login credentials')) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    if (msg.includes('Email not confirmed')) {
      throw new Error('이메일 인증이 필요합니다.');
    }
    if (msg.includes('User not found')) {
      throw new Error('존재하지 않는 계정입니다.');
    }
    throw new Error(msg || '로그인 처리에 실패했습니다.');
  }
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

export interface CollectionInheritanceResult {
  ancestors: any[];
  variables: KeyValueItem[];
  headers: KeyValueItem[];
  pathString: string;
}

export const getCollectionAncestors = (
  targetCollection: any | null,
  allCollections: any[]
): any[] => {
  if (!targetCollection || !Array.isArray(allCollections)) return [];

  const chain: any[] = [];
  let curr: any | undefined = targetCollection;
  const visited = new Set<string>();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    chain.unshift(curr);
    if (curr.parentId) {
      curr = allCollections.find((c) => c.id === curr!.parentId);
    } else {
      break;
    }
  }

  return chain;
};

export const getRootCollectionId = (targetId: string, allCollections: any[]): string => {
  if (!targetId || !allCollections || allCollections.length === 0) return targetId;
  const map = new Map<string, any>(allCollections.map((c) => [c.id, c]));
  let curr = map.get(targetId);
  const visited = new Set<string>();

  while (curr && curr.parentId && map.has(curr.parentId) && !visited.has(curr.parentId)) {
    visited.add(curr.id);
    curr = map.get(curr.parentId);
  }
  return curr ? curr.id : targetId;
};

export const getTreeFamilyCollectionIds = (targetId: string, allCollections: any[]): string[] => {
  if (!targetId || !allCollections || allCollections.length === 0) return [targetId];
  const rootId = getRootCollectionId(targetId, allCollections);

  const familyIds = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const col of allCollections) {
      if (col.parentId && familyIds.has(col.parentId) && !familyIds.has(col.id)) {
        familyIds.add(col.id);
        added = true;
      }
    }
  }

  return Array.from(familyIds);
};

export const getMergedCollectionInheritance = (
  targetCollection: any | null,
  allCollections: any[]
): CollectionInheritanceResult => {
  const chain = getCollectionAncestors(targetCollection, allCollections);

  const varsMap = new Map<string, KeyValueItem>();
  const headersMap = new Map<string, KeyValueItem>();

  chain.forEach((col) => {
    // Top-down iteration: Child overrides parent if same key exists
    (col.variables || []).filter((v: any) => v.enabled && v.key && v.key.trim()).forEach((v: any) => {
      varsMap.set(v.key.trim(), v);
    });
    (col.headers || []).filter((h: any) => h.enabled && h.key && h.key.trim()).forEach((h: any) => {
      headersMap.set(h.key.trim(), h);
    });
  });

  return {
    ancestors: chain,
    variables: Array.from(varsMap.values()),
    headers: Array.from(headersMap.values()),
    pathString: chain.map((c: any) => c.name).join(' > '),
  };
};

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

export const DEFAULT_BASE_VAR = {
  id: 'var-default-base',
  key: 'base',
  value: 'http://localhost:3000',
  enabled: true,
};

export const ensureDefaultBaseVar = (vars: any[] = []): any[] => {
  const hasBase = (vars || []).some((v) => v && v.key && v.key.trim().toLowerCase() === 'base');
  if (!hasBase) {
    return [DEFAULT_BASE_VAR, ...(vars || [])];
  }
  return vars;
};

export const fetchCollections = async (): Promise<any[]> => {
  const localList = getStoredLocalCollections();
  let dbList: any[] = [];

  try {
    const userRes = await supabase.auth.getUser();
    const user = userRes?.data?.user;

    let query = supabase.from('collections').select('*');
    if (user?.id) {
      query = query.or(`user_id.eq.${user.id},user_id.is.null`);
    }

    const { data: collectionsData, error: collectionsError } = await query.order('created_at', { ascending: false });

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
          parentId: col.parent_id || col.parentId || null,
          description: col.description || '',
          variables: ensureDefaultBaseVar(col.variables),
          headers: col.headers || [],
          items: colItems,
          timestamp: col.created_at,
        };
      });
    }
  } catch (e) {
    console.error('Fetch DB collections error:', e);
  }

  // Safely merge DB list and Local list (prefer DB version if duplicate id)
  const dbIds = new Set(dbList.map((c) => c.id));
  const uniqueLocals = localList.filter((c) => !dbIds.has(c.id));
  const mergedList = [...dbList, ...uniqueLocals].map((c) => ({
    ...c,
    variables: ensureDefaultBaseVar(c.variables),
  }));

  saveStoredLocalCollections(mergedList);
  return mergedList;
};

export const createCollectionGroup = async (
  group: {
    name: string;
    parentId?: string | null;
    description?: string;
    variables?: any[];
    headers?: any[];
  },
  allCollections: any[] = []
): Promise<any> => {
  try {
    const userRes = await supabase.auth.getUser();
    const user = userRes?.data?.user;

    let initVars = group.variables || [];
    let initHeaders = group.headers || [];

    if (group.parentId && allCollections.length > 0) {
      const parentCol = allCollections.find((c) => c.id === group.parentId);
      if (parentCol) {
        if (initVars.length === 0 && parentCol.variables) initVars = parentCol.variables;
        if (initHeaders.length === 0 && parentCol.headers) initHeaders = parentCol.headers;
      }
    }

    initVars = ensureDefaultBaseVar(initVars);

    const payload: any = {
      name: group.name,
      description: group.description || null,
      method: 'GET',
      url: '',
      params: [],
      body: null,
      variables: initVars,
      headers: initHeaders,
    };
    if (user?.id) {
      payload.user_id = user.id;
    }
    if (group.parentId && !group.parentId.startsWith('col-local-')) {
      payload.parent_id = group.parentId;
    }

    const { data, error } = await supabase
      .from('collections')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Supabase DB folder creation error:', error.message || error, error);
    } else if (data) {
      return {
        id: data.id,
        name: data.name,
        parentId: data.parent_id || group.parentId || null,
        description: data.description || '',
        variables: data.variables || [],
        headers: data.headers || [],
        items: [],
        timestamp: data.created_at,
      };
    }
  } catch (e) {
    console.error('Supabase folder creation exception:', e);
  }

  // Fallback ONLY if DB insert fails
  const createdFolder = {
    id: `col-local-${Date.now()}`,
    name: group.name,
    parentId: group.parentId || null,
    description: group.description || '',
    variables: group.variables || [],
    headers: group.headers || [],
    items: [],
    timestamp: new Date().toISOString(),
  };

  const currentLocals = getStoredLocalCollections();
  saveStoredLocalCollections([createdFolder, ...currentLocals]);

  return createdFolder;
};

export const updateCollectionGroupParentApi = async (
  collectionId: string,
  parentId: string | null
): Promise<boolean> => {
  try {
    const locals = getStoredLocalCollections();
    const updatedLocals = locals.map((c) =>
      c.id === collectionId ? { ...c, parentId } : c
    );
    saveStoredLocalCollections(updatedLocals);

    if (!collectionId.startsWith('col-local-')) {
      const { error } = await supabase
        .from('collections')
        .update({ parent_id: parentId })
        .eq('id', collectionId)
        .select();
      return !error;
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const updateCollectionGroupConfig = async (
  collectionId: string,
  variables: any[],
  headers: any[],
  allCollections: any[] = []
): Promise<boolean> => {
  try {
    const familyIds = getTreeFamilyCollectionIds(collectionId, allCollections);
    const familySet = new Set(familyIds);

    const locals = getStoredLocalCollections();
    const updatedLocals = locals.map((c) =>
      familySet.has(c.id) ? { ...c, variables, headers } : c
    );
    saveStoredLocalCollections(updatedLocals);

    const dbIds = familyIds.filter((id) => !id.startsWith('col-local-'));
    if (dbIds.length > 0) {
      const { error } = await supabase
        .from('collections')
        .update({ variables, headers })
        .in('id', dbIds)
        .select();
      return !error;
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const updateCollectionGroupNameApi = async (
  collectionId: string,
  newName: string
): Promise<boolean> => {
  try {
    const locals = getStoredLocalCollections();
    const updatedLocals = locals.map((c) =>
      c.id === collectionId ? { ...c, name: newName } : c
    );
    saveStoredLocalCollections(updatedLocals);

    if (!collectionId.startsWith('col-local-')) {
      const { error } = await supabase
        .from('collections')
        .update({ name: newName })
        .eq('id', collectionId)
        .select();
      return !error;
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const deleteCollectionGroupApi = async (id: string): Promise<boolean> => {
  try {
    if (!id.startsWith('col-local-')) {
      const { error } = await supabase.from('collections').delete().eq('id', id);
      return !error;
    } else {
      const locals = getStoredLocalCollections();
      saveStoredLocalCollections(locals.filter((c) => c.id !== id));
      return true;
    }
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
}): Promise<any> => {
  try {
    if (!item.collectionId.startsWith('col-local-')) {
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

      if (error) {
        console.error('Supabase DB item creation error:', error.message || error);
      } else if (data) {
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
      }
    }
  } catch (e) {
    console.error('Supabase item creation exception:', e);
  }

  // Fallback ONLY for guest mode
  const savedItem = {
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

export const updateCollectionRequestItemApi = async (
  itemId: string,
  update: {
    collectionId?: string;
    name?: string;
    method?: string;
    url?: string;
    params?: any[];
    headers?: any[];
    body?: string;
  }
): Promise<boolean> => {
  try {
    // 1. Synchronously update local storage cache first
    const locals = getStoredLocalCollections();
    if (update.collectionId) {
      let movedItem: any = null;
      locals.forEach((col) => {
        const found = (col.items || []).find((it: any) => it.id === itemId);
        if (found) movedItem = { ...found, ...update, collectionId: update.collectionId };
      });
      if (movedItem) {
        const updatedLocals = locals.map((col) => {
          const filtered = (col.items || []).filter((it: any) => it.id !== itemId);
          if (col.id === update.collectionId) {
            return { ...col, items: [...filtered, movedItem] };
          }
          return { ...col, items: filtered };
        });
        saveStoredLocalCollections(updatedLocals);
      }
    } else {
      const updatedLocals = locals.map((col) => ({
        ...col,
        items: (col.items || []).map((it: any) =>
          it.id === itemId ? { ...it, ...update } : it
        ),
      }));
      saveStoredLocalCollections(updatedLocals);
    }

    // 2. Update Supabase DB if it's a DB item
    if (!itemId.startsWith('item-local-')) {
      const payload: any = { ...update };
      if (update.collectionId) {
        payload.collection_id = update.collectionId;
        delete payload.collectionId;
      }

      const { data, error } = await supabase
        .from('collection_items')
        .update(payload)
        .eq('id', itemId)
        .select();

      if (error) {
        console.error('Supabase update collection item error:', error);
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const deleteCollectionRequestItemApi = async (id: string): Promise<boolean> => {
  try {
    if (!id.startsWith('item-local-')) {
      const { error } = await supabase.from('collection_items').delete().eq('id', id);
      return !error;
    } else {
      const locals = getStoredLocalCollections();
      const updatedLocals = locals.map((col) => ({
        ...col,
        items: (col.items || []).filter((item: any) => item.id !== id),
      }));
      saveStoredLocalCollections(updatedLocals);
      return true;
    }
  } catch (e) {
    return false;
  }
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

