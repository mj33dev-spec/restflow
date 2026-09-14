import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, BookmarkPlus, Folder, Plus, Tag, Braces, Layers, Save } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { KeyValueEditor } from './components/KeyValueEditor';
import { Modal } from './components/common/Modal';
import { TabButton } from './components/common/TabButton';
import { MethodBadge } from './components/common/MethodBadge';
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
  signInWithEmail,
  signUpWithEmail,
  fetchUserSettings,
  saveUserSettings,
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

  // --- Modal States & Controls ---
  // 1. Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authErrorMsg, setAuthErrorMsg] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // 2. Save Collection Modal State
  const [isSaveCollectionModalOpen, setIsSaveCollectionModalOpen] = useState<boolean>(false);
  const [saveFolderId, setSaveFolderId] = useState<string>('new');
  const [saveNewFolderName, setSaveNewFolderName] = useState<string>('');
  const [saveRequestName, setSaveRequestName] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // 3. Collection Config Modal State
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
    }
  };

  // Listen for Supabase Auth state changes & load user data & layout settings
  useEffect(() => {
    getCurrentUser().then((usr) => {
      setUser(usr);
      if (usr) {
        loadCollectionsData();
        loadUserSettingsData();
      }
    });

    const { data: authListener } = onAuthChange((usr) => {
      setUser(usr);
      if (usr) {
        loadCollectionsData();
        loadUserSettingsData();
      } else {
        setCollections([]);
        setActiveCollection(null);
        setSidebarWidth(320);
        setRequestPanelHeight(50);
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
      if (user) {
        saveUserSettings({ sidebarWidth: finalWidth });
      }
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
      if (user) {
        saveUserSettings({ requestPanelHeight: finalPercent });
      }
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
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

  // Auth Submit Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMsg('');
    if (!authEmail || !authPassword) {
      setAuthErrorMsg('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        await signInWithEmail(authEmail, authPassword);
        setIsAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        loadCollectionsData();
      } else {
        await signUpWithEmail(authEmail, authPassword);
        try {
          await signInWithEmail(authEmail, authPassword);
          setIsAuthModalOpen(false);
          setAuthEmail('');
          setAuthPassword('');
          loadCollectionsData();
        } catch {
          alert('회원가입이 완료되었습니다! 로그인해 주세요.');
          setAuthMode('signin');
        }
      }
    } catch (err: any) {
      let msg = err.message || '인증 처리에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.';
      if (msg.includes('Email not confirmed')) {
        msg = '이메일 인증이 필요합니다. Supabase Authentication 설정에서 [Confirm email]을 OFF로 꺼주세요.';
      } else if (msg.includes('Invalid login credentials')) {
        msg = '이메일 또는 비밀번호가 올바르지 않습니다. (계정이 존재하지 않거나 비밀번호 오류)';
      } else if (msg.includes('User already registered')) {
        msg = '이미 가입되어 있는 이메일 주소입니다.';
      } else if (msg.toLowerCase().includes('rate limit')) {
        msg = '이메일 발송 제한(Rate Limit)을 초과했습니다. Supabase 대시보드 (Authentication -> Providers -> Email)에서 [Confirm email]을 OFF로 끄시거나 5~10분 후 다시 시도해 주세요.';
      } else if (msg.toLowerCase().includes('signups are disabled')) {
        msg = '이메일 회원가입 기능이 꺼져있습니다. Supabase 대시보드 (Authentication -> Providers -> Email)에서 [Allow new users to sign up] 또는 [Enable Email provider] 스위치를 ON(켜짐)으로 켜주세요.';
      }
      setAuthErrorMsg(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Save Collection Submit Handler
  const handleSaveCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveRequestName.trim()) return;

    setSaveLoading(true);
    try {
      if (saveFolderId === 'new') {
        if (!saveNewFolderName.trim()) {
          alert('새 컬렉션 폴더 이름을 입력해 주세요.');
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
    } catch (e) {
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

  const handleSaveCollectionConfigConfirm = async () => {
    if (!configCollectionModalTarget) return;
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
    if (activeCollection?.id === configCollectionModalTarget.id) {
      setActiveCollection((prev) => (prev ? { ...prev, variables: configVariables, headers: configHeaders } : null));
    }
    setConfigCollectionModalTarget(null);
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
          width={sidebarWidth}
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

        {/* Vertical Resizer between Sidebar and Main Content */}
        <div
          className={`resizer-vertical ${isDraggingSidebar ? 'active' : ''}`}
          onMouseDown={handleSidebarMouseDown}
          title="드래그하여 사이드바 너비 조절"
        />

        <main
          ref={mainContainerRef}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
        >
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
            height={requestPanelHeight}
            request={request}
            onChange={setRequest}
            onSend={handleSend}
            isLoading={isLoading}
            onOpenSaveCollection={handleOpenSaveCollection}
          />

          {/* Horizontal Resizer between RequestPanel and ResponsePanel */}
          <div
            className={`resizer-horizontal ${isDraggingBody ? 'active' : ''}`}
            onMouseDown={handleBodyMouseDown}
            title="드래그하여 요청/응답 패널 높이 조절"
          />

          <ResponsePanel response={response} isLoading={isLoading} />
        </main>
      </div>

      {/* 1. Auth Modal - Direct Modal Component Usage */}
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

      {/* 2. Save Collection Modal - Direct Modal Component Usage */}
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
              <MethodBadge method={request.method} />
              <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {request.url}
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

      {/* 3. Collection Config Modal - Direct Modal Component Usage */}
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
              badge={configVariables.filter(v => v.enabled && v.key).length}
              style={{ flex: 1, padding: '10px', justifyContent: 'center', borderRadius: 0 }}
            />
            <TabButton
              active={configActiveTab === 'headers'}
              onClick={() => setConfigActiveTab('headers')}
              icon={<Layers size={14} />}
              label="공통 헤더 (Headers / Auth)"
              badge={configHeaders.filter(h => h.enabled && h.key).length}
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
                valuePlaceholder="변수 값 (예: http://localhost:3002)"
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

