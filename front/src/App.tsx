import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { AuthModal } from './components/AuthModal';
import { SaveCollectionModal } from './components/SaveCollectionModal';
import { RequestState, ResponseResult, HistoryItem, CollectionItem, HttpMethod, KeyValueItem } from './types';
import {
  executeHttpRequest,
  fetchHistory,
  saveHistory,
  clearHistoryApi,
  deleteHistoryItemApi,
  fetchCollections,
  saveCollectionItem,
  deleteCollectionItemApi,
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
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  
  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSaveCollectionModalOpen, setIsSaveCollectionModalOpen] = useState<boolean>(false);

  const [request, setRequest] = useState<RequestState>({
    method: 'GET',
    url: 'http://localhost:3002/api/echo?query=hello',
    params: [
      { id: '1', key: 'query', value: 'hello', enabled: true },
      { id: '2', key: 'page', value: '1', enabled: true },
    ],
    headers: [
      { id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true },
      { id: 'h2', key: 'Accept', value: 'application/json', enabled: true },
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

    const result = await executeHttpRequest({ ...request, useProxy });
    setResponse(result);
    setIsLoading(false);

    // Save to history (optional)
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

  const handleSaveCollectionConfirm = async (name: string, description?: string) => {
    const saved = await saveCollectionItem({
      name,
      description,
      method: request.method,
      url: request.url,
      params: request.params,
      headers: request.headers,
      body: request.body,
    });

    if (saved) {
      setCollections((prev) => [saved, ...prev]);
    } else {
      loadCollectionsData();
    }
  };

  const handleSelectCollection = (col: CollectionItem) => {
    setRequest({
      ...request,
      method: col.method || 'GET',
      url: col.url,
      params: Array.isArray(col.params) ? col.params : request.params,
      headers: Array.isArray(col.headers) ? col.headers : request.headers,
      body: col.body || '',
    });
  };

  const handleDeleteCollectionItem = async (id: string) => {
    await deleteCollectionItemApi(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setCollections([]);
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
          onSelectCollection={handleSelectCollection}
          onDeleteCollectionItem={handleDeleteCollectionItem}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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
        onClose={() => setIsSaveCollectionModalOpen(false)}
        onSave={handleSaveCollectionConfirm}
        defaultUrl={request.url}
        defaultMethod={request.method}
      />
    </div>
  );
};
