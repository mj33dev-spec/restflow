import '../index.css';

let loadingContainer: HTMLDivElement | null = null;
let fadeOutTimer: number | null = null;
let progressInterval: number | null = null;
let currentProgress = 0;
let isProgressMode = false;
let startTime = 0;
const MIN_LOADING_TIME_MS = 400; // Minimum time spinner is visible (prevents instant flickering)
const SUCCESS_DISPLAY_TIME_MS = 1000; // Time success checkmark stays visible for user to read comfortably
const FADE_OUT_ANIMATION_MS = 400; // CSS fade out transition time

interface DLoadingFunction {
  (message?: string): void;
  progress: (durationMs: number, message?: string) => void;
  dismiss: (message?: string) => void;
}

const createLoadingDOM = () => {
  if (loadingContainer) return loadingContainer;

  loadingContainer = document.createElement('div');
  loadingContainer.id = 'd-loading-overlay';
  document.body.appendChild(loadingContainer);

  return loadingContainer;
};

const destroyLoadingDOM = () => {
  if (loadingContainer && loadingContainer.parentNode) {
    loadingContainer.parentNode.removeChild(loadingContainer);
  }
  loadingContainer = null;
  isProgressMode = false;
  currentProgress = 0;
  if (progressInterval) {
    window.clearInterval(progressInterval);
    progressInterval = null;
  }
  if (fadeOutTimer) {
    window.clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
};

const renderContent = (message: string, isSuccess: boolean = false) => {
  if (!loadingContainer) return;

  if (isSuccess) {
    loadingContainer.innerHTML = `
      <div class="d-loading-content success">
        <div class="success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="d-loading-text">${message || '완료되었습니다.'}</div>
      </div>
    `;
  } else if (isProgressMode) {
    loadingContainer.innerHTML = `
      <div class="d-loading-content">
        <div class="d-progress-wrapper">
          <div class="d-progress-bar" style="width: ${currentProgress}%"></div>
        </div>
        <div class="d-loading-text">${message || '진행 중...'} <span class="d-percent">${currentProgress}%</span></div>
      </div>
    `;
  } else {
    loadingContainer.innerHTML = `
      <div class="d-loading-content">
        <div class="d-spinner"></div>
        <div class="d-loading-text">${message || '잠시만 기다려주세요..'}</div>
      </div>
    `;
  }
};

const DLoadingBase = (message?: string) => {
  if (fadeOutTimer) {
    window.clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
  if (progressInterval) {
    window.clearInterval(progressInterval);
    progressInterval = null;
  }

  startTime = Date.now();
  isProgressMode = false;
  const container = createLoadingDOM();
  container.className = 'd-loading-overlay active';
  renderContent(message || '잠시만 기다려주세요..');
};

const DLoadingProgress = (durationMs: number, message?: string) => {
  if (fadeOutTimer) {
    window.clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
  if (progressInterval) {
    window.clearInterval(progressInterval);
    progressInterval = null;
  }

  startTime = Date.now();
  isProgressMode = true;
  currentProgress = 0;

  const container = createLoadingDOM();
  container.className = 'd-loading-overlay active';
  renderContent(message || '진행 중...');

  const pStartTime = Date.now();
  progressInterval = window.setInterval(() => {
    const elapsed = Date.now() - pStartTime;
    const nextProgress = Math.min(100, Math.floor((elapsed / durationMs) * 100));

    if (nextProgress !== currentProgress) {
      currentProgress = nextProgress;

      const progressBar = loadingContainer?.querySelector('.d-progress-bar') as HTMLElement | null;
      const percentText = loadingContainer?.querySelector('.d-percent');

      if (progressBar) progressBar.style.width = `${currentProgress}%`;
      if (percentText) percentText.textContent = `${currentProgress}%`;
    }

    if (elapsed >= durationMs) {
      if (progressInterval) {
        window.clearInterval(progressInterval);
        progressInterval = null;
      }
    }
  }, 16);
};

const DLoadingDismiss = (message?: string) => {
  if (!loadingContainer) return;
  if (progressInterval) {
    window.clearInterval(progressInterval);
    progressInterval = null;
  }

  const timeElapsed = Date.now() - startTime;
  const delayBeforeSuccess = Math.max(0, MIN_LOADING_TIME_MS - timeElapsed);

  window.setTimeout(() => {
    if (!loadingContainer) return;
    renderContent(message || '완료되었습니다.', true);

    fadeOutTimer = window.setTimeout(() => {
      if (loadingContainer) {
        loadingContainer.classList.add('fade-out');

        fadeOutTimer = window.setTimeout(() => {
          destroyLoadingDOM();
        }, FADE_OUT_ANIMATION_MS);
      }
    }, SUCCESS_DISPLAY_TIME_MS);
  }, delayBeforeSuccess);
};

export const DLoading = DLoadingBase as DLoadingFunction;
DLoading.progress = DLoadingProgress;
DLoading.dismiss = DLoadingDismiss;
