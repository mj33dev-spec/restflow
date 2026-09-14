import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  DAlertComponent,
  DAlertProps,
  DAlertType,
  DAlertButtonType,
  DAlertDirection,
} from '../components/common/DAlert';

export type { DAlertType, DAlertButtonType, DAlertDirection, DAlertProps };

export interface DAlertOptions {
  title?: string;
  type?: DAlertType;
  buttonType?: DAlertButtonType;
  direction?: DAlertDirection;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  promptDefaultValue?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onPromptSubmit?: (value: string) => void;
}

let alertContainer: HTMLDivElement | null = null;
let alertRoot: Root | null = null;

const ALERT_ROOT_CLEANUP_DELAY_MS = 300;

export const DAlert = Object.assign(
  (message: string, options?: DAlertOptions) => {
    if (!alertContainer || !alertRoot) {
      const container = document.createElement('div');
      document.body.appendChild(container);
      alertContainer = container;
      alertRoot = createRoot(container);
    }

    const root = alertRoot;
    let isClosed = false;

    const handleClose = () => {
      if (isClosed) return;
      isClosed = true;
      root.render(
        React.createElement(DAlertComponent, {
          ...options,
          isOpen: false,
          message,
          onClose: () => {},
        })
      );

      window.setTimeout(() => {
        if (alertRoot === root && isClosed) {
          root.unmount();
          alertContainer?.remove();
          alertContainer = null;
          alertRoot = null;
        }
      }, ALERT_ROOT_CLEANUP_DELAY_MS);
    };

    root.render(
      React.createElement(DAlertComponent, {
        type: 'info',
        direction: 'center',
        buttonType: 'okOnly',
        ...options,
        isOpen: true,
        message,
        onClose: handleClose,
      })
    );
  },
  {
    info: (message: string, options?: DAlertOptions) =>
      DAlert(message, { ...options, type: 'info' }),

    success: (message: string, options?: DAlertOptions) =>
      DAlert(message, { ...options, type: 'success' }),

    warn: (message: string, options?: DAlertOptions) =>
      DAlert(message, { ...options, type: 'warn' }),

    error: (message: string, options?: DAlertOptions) =>
      DAlert(message, { ...options, type: 'error' }),

    confirm: (message: string, onConfirm?: () => void, options?: DAlertOptions) =>
      DAlert(message, {
        ...options,
        buttonType: 'okCancel',
        type: options?.type || 'warn',
        onConfirm,
      }),

    confirmAsync: (message: string, options?: DAlertOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        DAlert(message, {
          ...options,
          buttonType: 'okCancel',
          type: options?.type || 'warn',
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
    },

    prompt: (
      message: string,
      onPromptSubmit?: (value: string) => void,
      options?: DAlertOptions
    ) =>
      DAlert(message, {
        ...options,
        buttonType: 'okCancel',
        isPrompt: true,
        onPromptSubmit,
      }),

    promptAsync: (message: string, options?: DAlertOptions): Promise<string | null> => {
      return new Promise((resolve) => {
        DAlert(message, {
          ...options,
          buttonType: 'okCancel',
          isPrompt: true,
          onPromptSubmit: (val) => resolve(val),
          onCancel: () => resolve(null),
        });
      });
    },
  }
);
