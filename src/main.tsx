import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Nuclear reset for Service Workers to fix hangs
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      // Skip unregistering OneSignal workers to avoid connection errors
      const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
      if (scriptURL.includes('OneSignal')) {
        continue;
      }
      registration.unregister();
      console.log('[SW] Nuclear reset: Unregistered stale worker');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
