/// <reference types="vite-plugin-pwa/client" />

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}
