import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import AppRoutes from './routes/AppRoutes';
import useThemeStore, { applyThemeToDOM } from './store/themeStore';

export const App = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Handle stale Vercel deployment chunk load failures (MIME type / Failed to fetch module)
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const reason = 'reason' in event ? (event as PromiseRejectionEvent).reason : (event as ErrorEvent).error;
      const message = String(reason?.message || (event as ErrorEvent).message || '');
      if (
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Expected a JavaScript-or-Wasm module script') ||
        message.includes('Importing a module script failed') ||
        message.includes('Strict MIME type checking is enforced')
      ) {
        const hasReloaded = sessionStorage.getItem('chunk_reload_retry');
        if (!hasReloaded) {
          sessionStorage.setItem('chunk_reload_retry', 'true');
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleChunkError);
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
    };
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;