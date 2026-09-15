import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, BookmarkPlus, Folder, Plus, Tag, Braces, Layers, Save } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { CollectionConfigPanel } from './components/CollectionConfigPanel';
import { KeyValueEditor } from './components/KeyValueEditor';
import { Modal } from './components/common/Modal';
import { TabButton } from './components/common/TabButton';
import { MethodBadge } from './components/common/MethodBadge';
import { SpreadsheetTabBar } from './components/common/SpreadsheetTabBar';
import {
  RequestState,
  ResponseResult,
  HistoryItem,
  CollectionGroup,
  CollectionRequestItem,
  HttpMethod,
  KeyValueItem,
  ApiTab,
} from './types';
import { DLoading } from './services/DLoading';
import { DAlert } from './services/DAlert';
import {
  executeHttpRequest,
  fetchHistory,
  saveHistory,
  clearHistoryApi,
  deleteHistoryItemApi,
  fetchCollections,
  createCollectionGroup,
  updateCollectionGroupConfig,
  updateCollectionGroupNameApi,
  deleteCollectionGroupApi,
  saveCollectionRequestItem,
  updateCollectionRequestItemApi,
  deleteCollectionRequestItemApi,
  getCurrentUser,
  onAuthChange,
  signOutUser,
  signInWithEmail,
  signUpWithEmail,
  fetchUserSettings,
  saveUserSettings,
} from './services/apiService';

const createDefaultRequest = (): RequestState => ({
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  variables: [],
  bodyType: 'json',
  body: '',
  useProxy: false,
});

const createInitialTab = (id = 'tab-1', title = '요청 1'): ApiTab => ({
  id,
  title,
  request: createDefaultRequest(),
  response: null,
  activeCollection: null,
});

export const App: React.FC = () => {
  const [useProxy, setUseProxy] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Multi-Tab Api States
  const [tabs, setTabs] = useState<ApiTab[]>([createInitialTab('tab-1', '요청 1')]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Auth & DB states
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [collections, setCollections] = useState<CollectionGroup[]>([]);

  // --- Modal States ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authErrorMsg, setAuthErrorMsg] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [isSaveCollectionModalOpen, setIsSaveCollectionModalOpen] = useState<boolean>(false);
  const [saveFolderId, setSaveFolderId] = useState<string>('new');
  const [saveNewFolderName, setSaveNewFolderName] = useState<string>('');
  const [saveRequestName, setSaveRequestName] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  const [configCollectionModalTarget, setConfigCollectionModalTarget] = useState<CollectionGroup | null>(null);
  const [configActiveTab, setConfigActiveTab] = useState<'variables' | 'headers'>('variables');
  const [configVariables, setConfigVariables] = useState<KeyValueItem[]>([]);
  const [configHeaders, setConfigHeaders] = useState<KeyValueItem[]>([]);

  // --- Resizing States ---
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [requestPanelHeight, setRequestPanelHeight] = useState<number>(50);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);
  const [isDraggingBody, setIsDraggingBody] = useState<boolean>(false);

  const mainContainerRef = React.useRef<HTMLElement | null>(null);

  // Active Tab Helper
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || createInitialTab();

  const updateActiveTab = (partial: Partial<ApiTab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, ...partial } : t))
    );
  };

  const handleRequestChange = (newReq: RequestState) => {
    let newTitle = activeTab.title;
    // Auto-update tab title if default title format
    if (newTitle.startsWith('요청 ') || newTitle.includes('/')) {
      if (newReq.url && newReq.url.trim()) {
        const pathPart = newReq.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
        newTitle = `${newReq.method} ${pathPart || newReq.url}`;
      }
    }
    updateActiveTab({ request: newReq, title: newTitle });
  };

  const handleCreateTab = (customReq?: RequestState, customTitle?: string, collection?: CollectionGroup | null) => {
    const newId = `tab-${Date.now()}`;
    const newTab: ApiTab = {
      id: newId,
      title: customTitle || `요청 ${tabs.length + 1}`,
      request: customReq ? { ...customReq } : createDefaultRequest(),
      response: null,
      activeCollection: collection !== undefined ? collection : (activeTab ? activeTab.activeCollection : null),
    };
    const newTabs = [...tabs, newTab];
    setTabs(newTabs);
    setActiveTabId(newId);
    saveUserSettings({ sidebarWidth, requestPanelHeight, tabs: newTabs, activeTabId: newId });
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length <= 1) return;
    const filtered = tabs.filter((t) => t.id !== id);
    let newActiveId = activeTabId;
    if (activeTabId === id) {
      newActiveId = filtered[filtered.length - 1].id;
    }
    setTabs(filtered);
    setActiveTabId(newActiveId);
    saveUserSettings({ sidebarWidth, requestPanelHeight, tabs: filtered, activeTabId: newActiveId });
  };

  const handleRenameTab = async (id: string, newTitle: string) => {
    const targetTab = tabs.find((t) => t.id === id);
    const trimmed = newTitle.trim();
    if (!targetTab || !trimmed || targetTab.title === trimmed) return;

    const updatedTabs = tabs.map((t) => (t.id === id ? { ...t, title: trimmed } : t));
    setTabs(updatedTabs);
    saveUserSettings({ sidebarWidth, requestPanelHeight, tabs: updatedTabs, activeTabId });

    if (targetTab.collectionItemId) {
      DLoading('시트 이름 변경 중...');
      try {
        await updateCollectionRequestItemApi(targetTab.collectionItemId, { name: trimmed });
        setCollections((prev) =>
          prev.map((col) => ({
            ...col,
            items: (col.items || []).map((it) =>
              it.id === targetTab.collectionItemId ? { ...it, name: trimmed } : it
            ),
          }))
        );
        DLoading.dismiss('시트 이름이 변경되었습니다!');
      } catch {
        DLoading.dismiss('시트 이름 변경 실패');
      }
    }
  };

  // Sync Save Collection folder selection
  useEffect(() => {
    if (collections && collections.length > 0) {
      setSaveFolderId(collections[0].id);
    } else {
      setSaveFolderId('new');
    }
  }, [collections, isSaveCollectionModalOpen]);

  // Sync Collection Config modal target
  useEffect(() => {
    if (configCollectionModalTarget) {
      setConfigVariables(configCollectionModalTarget.variables || []);
      setConfigHeaders(configCollectionModalTarget.headers || []);
    }
  }, [configCollectionModalTarget]);

  const loadUserSettingsData = async () => {
    const settings = await fetchUserSettings();
    if (settings) {
      if (typeof settings.sidebarWidth === 'number') {
        setSidebarWidth(settings.sidebarWidth);
      }
      if (typeof settings.requestPanelHeight === 'number') {
        setRequestPanelHeight(settings.requestPanelHeight);
      }
      if (Array.isArray(settings.tabs) && settings.tabs.length > 0) {
        const cleanedTabs = settings.tabs.map(t => ({
          ...t,
          request: {
            ...t.request,
            url: t.request.url === '{{baseUrl}}/api/echo?query={{queryVal}}' ? '' : t.request.url,
            variables: (t.request.variables || []).filter(v => v.key !== 'baseUrl' && v.key !== 'queryVal'),
            params: (t.request.params || []).filter(p => !(p.key === 'query' && p.value === '{{queryVal}}')),
          }
        }));
        setTabs(cleanedTabs);
        if (settings.activeTabId && cleanedTabs.some((t) => t.id === settings.activeTabId)) {
          setActiveTabId(settings.activeTabId);
        } else {
          setActiveTabId(cleanedTabs[0].id);
        }
      }
    }
  };

  // Listen for Supabase Auth state changes & load user data
  useEffect(() => {
    loadUserSettingsData();

    getCurrentUser().then((usr) => {
      setUser(usr);
      if (usr) {
        loadCollectionsData();
        loadUserSettingsData();
      }
    });

    const { data: authListener } = onAuthChange((usr) => {
      setUser(usr);
      loadUserSettingsData();
      if (usr) {
        loadCollectionsData();
      }
    });

    loadHistoryData();

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loadHistoryData = async () => {
    try {
      const list = await fetchHistory();
      setHistory(Array.isArray(list) ? list : []);
    } catch (e) {
      setHistory([]);
    }
  };

  const loadCollectionsData = async () => {
    try {
      const list = await fetchCollections();
      setCollections(Array.isArray(list) ? list : []);
    } catch (e) {
      setCollections([]);
    }
  };

  const handleSidebarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);

    let finalWidth = sidebarWidth;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      finalWidth = Math.min(Math.max(moveEvent.clientX, 180), 600);
      setSidebarWidth(finalWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      saveUserSettings({ sidebarWidth: finalWidth, requestPanelHeight, tabs, activeTabId });
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBodyMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingBody(true);

    let finalPercent = requestPanelHeight;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const offsetY = moveEvent.clientY - rect.top;
      const percent = (offsetY / rect.height) * 100;
      finalPercent = Math.min(Math.max(percent, 20), 80);
      setRequestPanelHeight(finalPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingBody(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      saveUserSettings({ sidebarWidth, requestPanelHeight: finalPercent, tabs, activeTabId });
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleToggleProxy = (val: boolean) => {
    setUseProxy(val);
    updateActiveTab({ request: { ...activeTab.request, useProxy: val } });
  };

  const handleSend = async () => {
    if (!activeTab.request.url.trim()) return;
    setIsLoading(true);
    updateActiveTab({ response: null });

    const colVars = activeTab.activeCollection ? activeTab.activeCollection.variables : [];
    const colHeaders = activeTab.activeCollection ? activeTab.activeCollection.headers : [];

    const result = await executeHttpRequest({ ...activeTab.request, useProxy }, colVars, colHeaders);
    updateActiveTab({ response: result });
    setIsLoading(false);

    // Save to history
    const saved = await saveHistory({
      method: activeTab.request.method,
      url: activeTab.request.url,
      status: result.status,
      timeMs: result.timeMs,
      body: activeTab.request.method !== 'GET' && activeTab.request.method !== 'HEAD' ? activeTab.request.body : undefined,
    });

    if (saved) {
      setHistory((prev) => [saved, ...prev]);
    } else {
      loadHistoryData();
    }
  };

  const handleQuickPreset = (method: HttpMethod, url: string, body?: string) => {
    const newReq: RequestState = {
      ...activeTab.request,
      method,
      url,
      body: body || activeTab.request.body,
    };
    const pathPart = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    updateActiveTab({ request: newReq, title: `${method} ${pathPart || url}` });
  };

  const handleSelectHistory = (item: HistoryItem) => {
    let params: KeyValueItem[] = [];
    if (item.params && typeof item.params === 'object') {
      params = Object.entries(item.params).map(([k, v], idx) => ({
        id: 'hist-p-' + idx,
        key: k,
        value: String(v),
        enabled: true,
      }));
    } else {
      params = activeTab.request.params || [];
    }

    const newReq: RequestState = {
      ...activeTab.request,
      method: (item.method as HttpMethod) || 'GET',
      url: item.url,
      params: params.length > 0 ? params : activeTab.request.params,
      body: item.body || activeTab.request.body,
    };

    const pathPart = item.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const title = `${item.method} ${pathPart || item.url}`;

    // 1. Check if a sheet for this history item is already open in current tabs
    const existingTab = tabs.find(
      (t) => t.request.method === item.method && t.request.url === item.url
    );

    if (existingTab) {
      // Switch focus to existing tab
      setActiveTabId(existingTab.id);
      return;
    }

    // 2. Otherwise open in new tab (or reuse untouched initial default tab)
    const isUntouchedDefaultTab =
      tabs.length === 1 &&
      !activeTab.response &&
      activeTab.request.url === createDefaultRequest().url &&
      (activeTab.title === '요청 1' || activeTab.title.startsWith('GET /api/echo'));

    if (isUntouchedDefaultTab) {
      updateActiveTab({ request: newReq, title });
    } else {
      handleCreateTab(newReq, title, activeTab.activeCollection);
    }
  };

  const handleClearHistory = async () => {
    await clearHistoryApi();
    setHistory([]);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await deleteHistoryItemApi(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMsg('');
    if (!authEmail || !authPassword) {
      setAuthErrorMsg('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setAuthLoading(true);
    DLoading(authMode === 'signin' ? '로그인 처리 중...' : '회원가입 처리 중...');
    try {
      if (authMode === 'signin') {
        await signInWithEmail(authEmail, authPassword);
        setIsAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        loadCollectionsData();
        loadUserSettingsData();
        DLoading.dismiss('로그인되었습니다!');
      } else {
        await signUpWithEmail(authEmail, authPassword);
        try {
          await signInWithEmail(authEmail, authPassword);
          setIsAuthModalOpen(false);
          setAuthEmail('');
          setAuthPassword('');
          loadCollectionsData();
          loadUserSettingsData();
          DLoading.dismiss('회원가입 및 로그인되었습니다!');
        } catch {
          alert('회원가입이 완료되었습니다! 로그인해 주세요.');
          setAuthMode('signin');
          DLoading.dismiss('회원가입이 완료되었습니다!');
        }
      }
    } catch (err: any) {
      let msg = err.message || '인증 처리에 실패했습니다.';
      setAuthErrorMsg(msg);
      DLoading.dismiss(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveRequestName.trim()) return;

    setSaveLoading(true);
    DLoading('컬렉션에 데이터 저장 중...');
    try {
      if (saveFolderId === 'new') {
        if (!saveNewFolderName.trim()) {
          alert('새 컬렉션 폴더 이름을 입력해 주세요.');
          DLoading.dismiss('새 컬렉션 폴더 이름을 입력해 주세요.');
          setSaveLoading(false);
          return;
        }
        await handleCreateFolderAndSave(saveNewFolderName.trim(), saveRequestName.trim());
      } else {
        await handleSaveToExistingFolder(saveFolderId, saveRequestName.trim());
      }
      setSaveRequestName('');
      setSaveNewFolderName('');
      setIsSaveCollectionModalOpen(false);
      DLoading.dismiss('컬렉션에 성공적으로 저장되었습니다!');
    } catch (e) {
      DLoading.dismiss('컬렉션 저장에 실패했습니다.');
      alert('컬렉션 저장에 실패했습니다.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOpenSaveCollection = () => {
    if (!user) {
      alert('컬렉션을 저장하고 관리하려면 먼저 로그인해 주세요.');
      setIsAuthModalOpen(true);
      return;
    }
    setIsSaveCollectionModalOpen(true);
  };

  const handleSaveToExistingFolder = async (collectionId: string, requestName: string) => {
    const savedItem = await saveCollectionRequestItem({
      collectionId,
      name: requestName,
      method: activeTab.request.method,
      url: activeTab.request.url,
      params: activeTab.request.params,
      headers: activeTab.request.headers,
      body: activeTab.request.body,
    });

    if (savedItem) {
      setCollections((prev) =>
        prev.map((col) =>
          col.id === collectionId ? { ...col, items: [...col.items, savedItem] } : col
        )
      );
    } else {
      loadCollectionsData();
    }
  };

  const handleCreateFolderAndSave = async (folderName: string, requestName: string) => {
    const newFolder = await createCollectionGroup({
      name: folderName,
    });

    if (!newFolder) {
      alert('새 컬렉션 폴더를 생성할 수 없습니다.');
      return;
    }

    const savedItem = await saveCollectionRequestItem({
      collectionId: newFolder.id,
      name: requestName,
      method: activeTab.request.method,
      url: activeTab.request.url,
      params: activeTab.request.params,
      headers: activeTab.request.headers,
      body: activeTab.request.body,
    });

    if (savedItem) {
      newFolder.items = [savedItem];
      setCollections((prev) => [newFolder, ...prev]);
    } else {
      loadCollectionsData();
    }
  };

  const handleSelectCollectionItem = (item: CollectionRequestItem, collection: CollectionGroup) => {
    const defaultReq = createDefaultRequest();
    const newReq: RequestState = {
      ...defaultReq,
      method: item.method || 'GET',
      url: item.url || '',
      params: Array.isArray(item.params) ? item.params : [],
      headers: Array.isArray(item.headers) ? item.headers : [],
      variables: Array.isArray((item as any).variables) ? (item as any).variables : [],
      body: item.body || '',
      useProxy: useProxy,
    };

    const targetTitle = item.name;

    // 1. Check if a sheet for this specific collection item is already open
    const existingTab = tabs.find(
      (t) =>
        t.collectionItemId === item.id ||
        (t.activeCollection?.id === collection.id && t.title === targetTitle)
    );

    if (existingTab) {
      // Update existing tab with latest request data and switch focus to it
      const updatedTabs = tabs.map((t) =>
        t.id === existingTab.id
          ? {
            ...t,
            request: newReq,
            title: targetTitle,
            activeCollection: collection,
            collectionItemId: item.id,
            type: 'request' as const,
          }
          : t
      );
      setTabs(updatedTabs);
      setActiveTabId(existingTab.id);
      saveUserSettings({ sidebarWidth, requestPanelHeight, tabs: updatedTabs, activeTabId: existingTab.id });
      return;
    }

    // 2. Otherwise open in new tab (or reuse untouched initial default tab)
    const isUntouchedDefaultTab =
      tabs.length === 1 &&
      !activeTab.response &&
      activeTab.type !== 'collectionConfig' &&
      !activeTab.collectionItemId &&
      activeTab.request.url === defaultReq.url &&
      (activeTab.title === '요청 1' || activeTab.title.startsWith('GET /api/echo'));

    if (isUntouchedDefaultTab) {
      updateActiveTab({
        request: newReq,
        title: targetTitle,
        activeCollection: collection,
        collectionItemId: item.id,
        type: 'request',
      });
    } else {
      const newTabId = `tab-item-${item.id}-${Date.now()}`;
      const newTab: ApiTab = {
        id: newTabId,
        title: targetTitle,
        request: newReq,
        response: null,
        activeCollection: collection,
        collectionItemId: item.id,
        type: 'request',
      };
      const newTabs = [...tabs, newTab];
      setTabs(newTabs);
      setActiveTabId(newTabId);
      saveUserSettings({ sidebarWidth, requestPanelHeight, tabs: newTabs, activeTabId: newTabId });
    }
  };

  const handleDeleteCollectionGroup = async (id: string) => {
    await deleteCollectionGroupApi(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setTabs((prev) =>
      prev.map((t) => (t.activeCollection?.id === id ? { ...t, activeCollection: null } : t))
    );
  };

  const handleRenameCollectionGroup = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    const target = collections.find((c) => c.id === id);
    if (!target || !trimmed || target.name === trimmed) return;

    DLoading('컬렉션 폴더 이름 저장 중...');
    await updateCollectionGroupNameApi(id, trimmed);
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c))
    );
    setTabs((prev) => {
      const updatedTabs = prev.map((t) => {
        const isConfigTab = t.configCollectionId === id || t.id === `tab-config-${id}`;
        const isActiveCollectionMatch = t.activeCollection?.id === id;

        if (isConfigTab || isActiveCollectionMatch) {
          return {
            ...t,
            title: isConfigTab ? `📁 ${trimmed} 설정` : t.title,
            activeCollection: t.activeCollection
              ? { ...t.activeCollection, name: trimmed }
              : t.activeCollection,
          };
        }
        return t;
      });
      saveUserSettings({ sidebarWidth, requestPanelHeight, tabs: updatedTabs, activeTabId });
      return updatedTabs;
    });
    DLoading.dismiss('컬렉션 이름이 변경되었습니다!');
  };

  const handleRenameCollectionItem = async (itemId: string, newName: string) => {
    const trimmed = newName.trim();
    let targetItem: CollectionRequestItem | null = null;
    for (const col of collections) {
      const found = col.items?.find((i) => i.id === itemId);
      if (found) {
        targetItem = found;
        break;
      }
    }

    if (!targetItem || !trimmed || targetItem.name === trimmed) return;

    DLoading('요청 항목 이름 변경 중...');
    try {
      await updateCollectionRequestItemApi(itemId, { name: trimmed });
      setCollections((prev) =>
        prev.map((col) => ({
          ...col,
          items: (col.items || []).map((it) =>
            it.id === itemId ? { ...it, name: trimmed } : it
          ),
        }))
      );
      setTabs((prev) => {
        const updated = prev.map((t) =>
          t.collectionItemId === itemId || (t.activeCollection && t.title === targetItem!.name)
            ? { ...t, title: trimmed }
            : t
        );
        saveUserSettings({ sidebarWidth, requestPanelHeight, tabs: updated, activeTabId });
        return updated;
      });
      DLoading.dismiss('요청 항목 이름이 변경되었습니다!');
    } catch (e) {
      DLoading.dismiss('요청 항목 이름 변경 실패');
    }
  };

  const handleDeleteCollectionItem = async (id: string) => {
    await deleteCollectionRequestItemApi(id);
    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        items: col.items.filter((item) => item.id !== id),
      }))
    );
  };

  const handleAutoSaveActiveTabRequestItem = async () => {
    if (!activeTab || !activeTab.collectionItemId) return;
    const itemId = activeTab.collectionItemId;
    const req = activeTab.request;

    await updateCollectionRequestItemApi(itemId, {
      method: req.method,
      url: req.url,
      params: req.params,
      headers: req.headers,
      body: req.body,
    });

    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        items: (col.items || []).map((it) =>
          it.id === itemId
            ? {
                ...it,
                method: req.method,
                url: req.url,
                params: req.params,
                headers: req.headers,
                body: req.body,
              }
            : it
        ),
      }))
    );
  };

  const handleSaveCollectionConfigConfirm = async () => {
    if (!configCollectionModalTarget) return;
    DLoading('컬렉션 공통 설정 저장 중...');
    await updateCollectionGroupConfig(
      configCollectionModalTarget.id,
      configVariables,
      configHeaders
    );
    setCollections((prev) =>
      prev.map((col) =>
        col.id === configCollectionModalTarget.id ? { ...col, variables: configVariables, headers: configHeaders } : col
      )
    );
    setTabs((prev) =>
      prev.map((t) =>
        t.activeCollection?.id === configCollectionModalTarget.id
          ? { ...t, activeCollection: { ...t.activeCollection!, variables: configVariables, headers: configHeaders } }
          : t
      )
    );
    setConfigCollectionModalTarget(null);
    DLoading.dismiss('컬렉션 설정이 저장되었습니다!');
  };

  const handleOpenCollectionConfigTab = (colGroup: CollectionGroup) => {
    const existingTab = tabs.find((t) => t.configCollectionId === colGroup.id || t.id === `tab-config-${colGroup.id}`);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const newTabId = `tab-config-${colGroup.id}`;
    const newTab: ApiTab = {
      id: newTabId,
      title: `📁 ${colGroup.name} 설정`,
      request: createDefaultRequest(),
      response: null,
      activeCollection: colGroup,
      type: 'collectionConfig',
      configCollectionId: colGroup.id,
    };
    const newTabs = [...tabs, newTab];
    setTabs(newTabs);
    setActiveTabId(newTabId);
    saveUserSettings({ sidebarWidth, requestPanelHeight, tabs: newTabs, activeTabId: newTabId });
  };

  const handleSaveCollectionConfigDirect = async (
    collectionId: string,
    variables: KeyValueItem[],
    headers: KeyValueItem[]
  ) => {
    await updateCollectionGroupConfig(collectionId, variables, headers);
    setCollections((prev) =>
      prev.map((col) =>
        col.id === collectionId ? { ...col, variables, headers } : col
      )
    );
    setTabs((prev) =>
      prev.map((t) =>
        t.activeCollection?.id === collectionId
          ? { ...t, activeCollection: { ...t.activeCollection!, variables, headers } }
          : t
      )
    );
  };

  const handleAddRequestToCollection = async (colGroup: CollectionGroup) => {
    const reqName = await DAlert.promptAsync(`'${colGroup.name}' 폴더에 추가할 새 API 요청 이름을 입력하세요:`, {
      title: '새 API 요청 생성',
      promptPlaceholder: '예: 회원가입 API 요청',
      promptDefaultValue: '새 API 요청',
      type: 'info',
    });
    if (!reqName || !reqName.trim()) return;

    DLoading('컬렉션에 새 API 요청 생성 중...');
    const savedItem = await saveCollectionRequestItem({
      collectionId: colGroup.id,
      name: reqName.trim(),
      method: 'GET',
      url: '',
      params: [],
      headers: [],
      body: '',
    });

    if (savedItem) {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === colGroup.id ? { ...c, items: [...(c.items || []), savedItem] } : c
        )
      );
      // Open newly created request in right main panel tab
      handleSelectCollectionItem(savedItem, colGroup);
      DLoading.dismiss('새 API 요청이 생성되었습니다!');
    } else {
      DLoading.dismiss('요청 생성에 실패했습니다.');
    }
  };

  const handleCreateFolderDirectly = async () => {
    const name = await DAlert.promptAsync('새 컬렉션 폴더 이름을 입력하세요:', {
      title: '새 컬렉션 폴더 생성',
      promptPlaceholder: '예: 쇼핑몰 API 프로젝트',
      type: 'info',
    });
    if (!name || !name.trim()) return;

    DLoading('새 컬렉션 폴더 생성 중...');
    const newFolder = await createCollectionGroup({ name: name.trim() });
    if (newFolder) {
      setCollections((prev) => [newFolder, ...prev]);
      DLoading.dismiss('컬렉션 폴더가 생성되었습니다!');
    } else {
      DLoading.dismiss('폴더 생성이 취소되었습니다.');
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setCollections([]);
    setTabs([createInitialTab('tab-1', '요청 1')]);
    setActiveTabId('tab-1');
  };

  return (
    <div className="app-container">
      <Header
        useProxy={useProxy}
        onToggleProxy={handleToggleProxy}
        onQuickPreset={handleQuickPreset}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <div className="main-layout">
        <Sidebar
          width={sidebarWidth}
          history={history}
          onSelectHistory={handleSelectHistory}
          onClearHistory={handleClearHistory}
          onDeleteHistoryItem={handleDeleteHistoryItem}
          collections={collections}
          onSelectCollectionItem={handleSelectCollectionItem}
          onDeleteCollectionGroup={handleDeleteCollectionGroup}
          onDeleteCollectionItem={handleDeleteCollectionItem}
          onOpenCollectionConfig={handleOpenCollectionConfigTab}
          onRenameCollectionGroup={handleRenameCollectionGroup}
          onRenameCollectionItem={handleRenameCollectionItem}
          onAddRequestToCollection={handleAddRequestToCollection}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onCreateFolderClick={handleCreateFolderDirectly}
          activeCollectionItemId={activeTab.collectionItemId}
          activeConfigCollectionId={activeTab.configCollectionId}
        />

        {/* Vertical Resizer between Sidebar and Main Frame */}
        <div
          className={`resizer-vertical ${isDraggingSidebar ? 'active' : ''}`}
          onMouseDown={handleSidebarMouseDown}
          title="드래그하여 사이드바 너비 조절"
        />

        {/* Main Body Frame Container */}
        <main
          ref={mainContainerRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            background: 'var(--bg-primary)'
          }}
        >
          {activeTab.type === 'collectionConfig' ? (
            <CollectionConfigPanel
              collection={
                collections.find((c) => c.id === activeTab.configCollectionId) ||
                activeTab.activeCollection || {
                  id: activeTab.configCollectionId || '',
                  name: activeTab.title.replace('📁 ', '').replace(' 설정', ''),
                  variables: [],
                  headers: [],
                  items: [],
                  timestamp: new Date().toISOString(),
                }
              }
              onSaveConfig={handleSaveCollectionConfigDirect}
            />
          ) : (
            <>
              {/* Active Collection Inheritance Status Bar */}
              {activeTab.activeCollection && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '6px 16px',
                  fontSize: '0.78rem',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0
                }}>
                  <span>
                    📁 활성화된 컬렉션 폴더: <strong>{activeTab.activeCollection.name}</strong> (공통 변수 {activeTab.activeCollection.variables.length}개, 공통 헤더 {activeTab.activeCollection.headers.length}개 상속 중)
                  </span>
                  <button
                    onClick={() => updateActiveTab({ activeCollection: null })}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    상속 해제
                  </button>
                </div>
              )}

              {/* Top Panel: Request Panel */}
              <RequestPanel
                height={requestPanelHeight}
                request={activeTab.request}
                onChange={handleRequestChange}
                onSend={handleSend}
                isLoading={isLoading}
                onOpenSaveCollection={handleOpenSaveCollection}
                activeCollection={activeTab.activeCollection}
                onUpdateCollectionConfig={handleSaveCollectionConfigDirect}
                onBlurUrl={handleAutoSaveActiveTabRequestItem}
              />

              {/* Horizontal Resizer between Request Panel and Response Panel */}
              <div
                className={`resizer-horizontal ${isDraggingBody ? 'active' : ''}`}
                onMouseDown={handleBodyMouseDown}
                title="드래그하여 요청/응답 패널 높이 조절"
              />

              {/* Middle Panel: Response Panel */}
              <ResponsePanel response={activeTab.response} isLoading={isLoading} />
            </>
          )}

          {/* Bottom Panel Frame: Excel Spreadsheet Sheet Tab Bar */}
          <SpreadsheetTabBar
            tabs={tabs}
            activeTabId={activeTab.id}
            onSelectTab={setActiveTabId}
            onCreateTab={() => handleCreateTab()}
            onCloseTab={handleCloseTab}
            onRenameTab={handleRenameTab}
          />
        </main>
      </div>

      {/* 1. Auth Modal */}
      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        width="400px"
        title={authMode === 'signin' ? '로그인' : '회원가입'}
        icon={authMode === 'signin' ? <LogIn size={18} color="var(--accent-primary)" /> : <UserPlus size={18} color="var(--accent-primary)" />}
        subHeader={
          <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
            <TabButton
              active={authMode === 'signin'}
              onClick={() => { setAuthMode('signin'); setAuthErrorMsg(''); }}
              label="기존 계정 로그인"
              style={{ flex: 1, padding: '12px', justifyContent: 'center', borderRadius: 0 }}
            />
            <TabButton
              active={authMode === 'signup'}
              onClick={() => { setAuthMode('signup'); setAuthErrorMsg(''); }}
              label="새 계정 회원가입"
              style={{ flex: 1, padding: '12px', justifyContent: 'center', borderRadius: 0 }}
            />
          </div>
        }
        body={
          <form id="auth-form" onSubmit={handleAuthSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {authErrorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.8rem',
                padding: '10px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{authErrorMsg}</span>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                이메일 주소
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    background: '#0d1117',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#fff',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                비밀번호
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
                <input
                  type="password"
                  placeholder="6자리 이상 비밀번호 입력"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    background: '#0d1117',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#fff',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </form>
        }
        footer={
          <button
            type="submit"
            form="auth-form"
            className="btn-primary"
            disabled={authLoading}
            style={{ width: '100%', justifyContent: 'center', height: '42px' }}
          >
            {authLoading ? '처리 중...' : authMode === 'signin' ? '로그인하기' : '회원가입하기'}
          </button>
        }
      />

      {/* 2. Save Collection Modal */}
      <Modal
        isOpen={isSaveCollectionModalOpen}
        onClose={() => setIsSaveCollectionModalOpen(false)}
        width="440px"
        title="컬렉션 폴더에 저장하기"
        icon={<BookmarkPlus size={18} color="var(--accent-primary)" />}
        body={
          <form id="save-collection-form" onSubmit={handleSaveCollectionSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: '#0d1117',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.8rem'
            }}>
              <MethodBadge method={activeTab.request.method} />
              <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeTab.request.url}
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                컬렉션 폴더 (그룹) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Folder size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
                <select
                  value={saveFolderId}
                  onChange={(e) => setSaveFolderId(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    background: '#0d1117',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#fff',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {collections.map((col) => (
                    <option key={col.id} value={col.id} style={{ background: '#1e293b' }}>
                      📁 {col.name} ({col.items.length}개 요청)
                    </option>
                  ))}
                  <option value="new" style={{ background: '#1e293b' }}>
                    ➕ 새 컬렉션 폴더 생성...
                  </option>
                </select>
              </div>
            </div>

            {saveFolderId === 'new' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  새 폴더 이름 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Plus size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
                  <input
                    type="text"
                    placeholder="예: Auth API 프로젝트"
                    value={saveNewFolderName}
                    onChange={(e) => setSaveNewFolderName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: '40px',
                      background: '#0d1117',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: '#fff',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                요청 항목 이름 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Tag size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-subtle)' }} />
                <input
                  type="text"
                  placeholder="예: 회원가입 API 요청"
                  value={saveRequestName}
                  onChange={(e) => setSaveRequestName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    background: '#0d1117',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#fff',
                    paddingLeft: '38px',
                    paddingRight: '12px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </form>
        }
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsSaveCollectionModalOpen(false)}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              취소
            </button>
            <button
              type="submit"
              form="save-collection-form"
              className="btn-primary"
              disabled={saveLoading || !saveRequestName.trim()}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {saveLoading ? '저장 중...' : '폴더에 저장'}
            </button>
          </>
        }
      />

      {/* 3. Collection Config Modal */}
      <Modal
        isOpen={!!configCollectionModalTarget}
        onClose={() => setConfigCollectionModalTarget(null)}
        width="560px"
        title={`${configCollectionModalTarget?.name || ''} (컬렉션 공통 설정)`}
        icon={<Folder size={18} color="var(--accent-primary)" />}
        subHeader={
          <div style={{ display: 'flex', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
            <TabButton
              active={configActiveTab === 'variables'}
              onClick={() => setConfigActiveTab('variables')}
              icon={<Braces size={14} />}
              label="공통 변수 (Variables)"
              badge={configVariables.filter((v) => v.enabled && v.key).length}
              style={{ flex: 1, padding: '10px', justifyContent: 'center', borderRadius: 0 }}
            />
            <TabButton
              active={configActiveTab === 'headers'}
              onClick={() => setConfigActiveTab('headers')}
              icon={<Layers size={14} />}
              label="공통 헤더 (Headers / Auth)"
              badge={configHeaders.filter((h) => h.enabled && h.key).length}
              style={{ flex: 1, padding: '10px', justifyContent: 'center', borderRadius: 0 }}
            />
          </div>
        }
        banner={
          <div style={{
            padding: '10px 16px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            fontSize: '0.78rem',
            lineHeight: 1.5
          }}>
            💡 <strong>컬렉션 공통 상속:</strong> 등록된 공통 변수 및 헤더(Authorization/Bearer 토큰 등)는 이 컬렉션 하위의 모든 API 요청 실행 시 자동으로 적용됩니다.
          </div>
        }
        body={
          <div style={{ minHeight: '220px' }}>
            {configActiveTab === 'variables' && (
              <KeyValueEditor
                items={configVariables}
                onChange={setConfigVariables}
                keyPlaceholder="공통 변수명 (예: baseUrl)"
                valuePlaceholder="변수 값 (예: https://api.example.com 또는 http://localhost:포트)"
              />
            )}

            {configActiveTab === 'headers' && (
              <KeyValueEditor
                items={configHeaders}
                onChange={setConfigHeaders}
                keyPlaceholder="공통 헤더명 (예: Authorization)"
                valuePlaceholder="헤더 값 (예: Bearer token...)"
              />
            )}
          </div>
        }
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfigCollectionModalTarget(null)}>
              취소
            </button>
            <button className="btn-primary" onClick={handleSaveCollectionConfigConfirm}>
              <Save size={15} /> 설정 저장하기
            </button>
          </>
        }
      />
    </div>
  );
};
