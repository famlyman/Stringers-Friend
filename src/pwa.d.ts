/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    OneSignal: {
      push: (cb: () => void) => void;
      init: (config: { appId: string; allowLocalhostAsSecureOrigin?: boolean; autoResend?: boolean }) => void;
    };
  }
}
