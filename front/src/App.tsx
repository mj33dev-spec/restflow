import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { AuthModal } from './components/AuthModal';
import { SaveCollectionModal } from './components/SaveCollectionModal';
import { CollectionConfigModal } from './components/CollectionConfigModal';
import {
  RequestState,
  ResponseResult,
  HistoryItem,
  CollectionGroup,
  CollectionRequestItem,
  HttpMethod,
  KeyValueItem,
} from './types';
import {
  executeHttpRequest,
  fetchHistory,
  saveHistory,
  clearHistoryApi,
  deleteHistoryItemApi,
  fetchCollections,
  createCollectionGroup,
  updateCollectionGroupConfig,
  deleteCollectionGroupApi,
  saveCollectionRequestItem,
  deleteCollectionRequestItemApi,
  getCurrentUser,
  onAuthChange,
  signOutUser,
} from './services/apiService';

export const App: React.FC = () => {
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<ResponseResult | null>(null);
  
  // Auth & DB states
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [collections, setCollections] = useState<CollectionGroup[]>([]);
  
  // Active Collection for Variable & Header Inheritance
  const [activeCollection, setActiveCollection] = useState<CollectionGroup | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSaveCollectionModalOpen, setIsSaveCollectionModalOpen] = useState<boolean>(false);
  const [configCollectionModalTarget, setConfigCollectionModalTarget] = useState<CollectionGroup | null>(null);

  const [request, setRequest] = useState<RequestState>({
    method: 'GET',
    url: '{{baseUrl}}/api/echo?query={{queryVal}}',
    params: [
      { id: '1', key: 'query', value: '{{queryVal}}', enabled: true },
      { id: '2', key: 'page', value: '1', enabled: true },
    ],
    headers: [
      { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
      { id: 'h2', key: 'Accept', value: 'application/json', enabled: true },
    ],
    variables: [
      { id: 'v1', key: 'baseUrl', value: 'http://localhost:3002', enabled: true },
      { id: 'v2', key: 'queryVal', value: 'hello', enabled: true },
    ],
    bodyType: 'json',
    body: '{\n  "client": "RestFlow React",\n  "test": true\n}',
    useProxy: true,
  });

  // Listen for Supabase Auth state changes & load user data
  useEffect(() => {
    getCurrentUser().then((usr) => {
      setUser(usr);
      if (usr) loadCollectionsData();
    });

    const { data: authListener } = onAuthChange((usr) => {
      setUser(usr);
      if (usr) {
        loadCollectionsData();
      } else {
        setCollections([]);
        setActiveCollection(null);
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

  const handleToggleProxy = (val: boolean) => {
    setUseProxy(val);
    setRequest((prev) => ({ ...prev, useProxy: val }));
  };

  const handleSend = async () => {
    if (!request.url.trim()) return;
    setIsLoading(true);
    setResponse(null);

    // Merge Collection-level variables and headers if active collection is set
    const colVars = activeCollection ? activeCollection.variables : [];
    const colHeaders = activeCollection ? activeCollection.headers : [];

    const result = await executeHttpRequest({ ...request, useProxy }, colVars, colHeaders);
    setResponse(result);
    setIsLoading(false);

    // Save to history
    const saved = await saveHistory({
      method: request.method,
      url: request.url,
      status: result.status,
      timeMs: result.timeMs,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    if (saved) {
      setHistory((prev) => [saved, ...prev]);
    } else {
      loadHistoryData();
    }
  };

  const handleQuickPreset = (method: HttpMethod, url: string, body?: string) => {
    const newReq: RequestState = {
      ...request,
      method,
      url,
      body: body || request.body,
    };
    setRequest(newReq);
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
      params = request.params || [];
    }

    setRequest({
      ...request,
      method: (item.method as HttpMethod) || 'GET',
      url: item.url,
      params: params.length > 0 ? params : request.params,
      body: item.body || request.body,
    });
  };

  const handleClearHistory = async () => {
    await clearHistoryApi();
    setHistory([]);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await deleteHistoryItemApi(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  // Collections handlers
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
      method: request.method,
      url: request.url,
      params: request.params,
      headers: request.headers,
      body: request.body,
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
      method: request.method,
      url: request.url,
      params: request.params,
      headers: request.headers,
      body: request.body,
    });

    if (savedItem) {
      newFolder.items = [savedItem];
      setCollections((prev) => [newFolder, ...prev]);
    } else {
      loadCollectionsData();
    }
  };

  const handleSelectCollectionItem = (item: CollectionRequestItem, collection: CollectionGroup) => {
    setActiveCollection(collection);
    setRequest({
      ...request,
      method: item.method || 'GET',
      url: item.url,
      params: Array.isArray(item.params) ? item.params : request.params,
      headers: Array.isArray(item.headers) ? item.headers : request.headers,
      body: item.body || '',
    });
  };

  const handleDeleteCollectionGroup = async (id: string) => {
    await deleteCollectionGroupApi(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (activeCollection?.id === id) {
      setActiveCollection(null);
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

  const handleSaveCollectionConfig = async (
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
    if (activeCollection?.id === collectionId) {
      setActiveCollection((prev) => (prev ? { ...prev, variables, headers } : null));
    }
  };

  const handleCreateFolderDirectly = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      setIsAuthModalOpen(true);
      return;
    }
    const name = prompt('새 컬렉션 폴더 이름을 입력하세요 (예: 쇼핑몰 API 프로젝트):');
    if (!name || !name.trim()) return;

    const newFolder = await createCollectionGroup({ name: name.trim() });
    if (newFolder) {
      setCollections((prev) => [newFolder, ...prev]);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setCollections([]);
    setActiveCollection(null);
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
          history={history}
          onSelectHistory={handleSelectHistory}
          onClearHistory={handleClearHistory}
          onDeleteHistoryItem={handleDeleteHistoryItem}
          collections={collections}
          onSelectCollectionItem={handleSelectCollectionItem}
          onDeleteCollectionGroup={handleDeleteCollectionGroup}
          onDeleteCollectionItem={handleDeleteCollectionItem}
          onOpenCollectionConfig={(colGroup) => setConfigCollectionModalTarget(colGroup)}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onCreateFolderClick={handleCreateFolderDirectly}
        />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {activeCollection && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
              padding: '6px 16px',
              fontSize: '0.78rem',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>
                📁 활성화된 컬렉션 폴더: <strong>{activeCollection.name}</strong> (공통 변수 {activeCollection.variables.length}개, 공통 헤더 {activeCollection.headers.length}개 상속 중)
              </span>
              <button
                onClick={() => setActiveCollection(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                상속 해제
              </button>
            </div>
          )}

          <RequestPanel
            request={request}
            onChange={setRequest}
            onSend={handleSend}
            isLoading={isLoading}
            onOpenSaveCollection={handleOpenSaveCollection}
          />
          <ResponsePanel response={response} isLoading={isLoading} />
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          loadCollectionsData();
        }}
      />

      {/* Save Collection Modal */}
      <SaveCollectionModal
        isOpen={isSaveCollectionModalOpen}
        collections={collections}
        onClose={() => setIsSaveCollectionModalOpen(false)}
        onSaveToFolder={handleSaveToExistingFolder}
        onCreateFolderAndSave={handleCreateFolderAndSave}
        defaultUrl={request.url}
        defaultMethod={request.method}
      />

      {/* Collection Config Modal */}
      <CollectionConfigModal
        isOpen={!!configCollectionModalTarget}
        collection={configCollectionModalTarget}
        onClose={() => setConfigCollectionModalTarget(null)}
        onSave={handleSaveCollectionConfig}
      />
    </div>
  );
};
