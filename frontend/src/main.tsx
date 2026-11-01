import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure fetch is always assignable if browser extensions attempt interception
try {
  const currentFetch = window.fetch;
  const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
  if (!descriptor || !descriptor.set) {
    let _activeFetch = currentFetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get: () => _activeFetch,
      set: (fn) => {
        _activeFetch = fn;
      },
    });
  }
} catch (_) {}

createRoot(document.getElementById('root')!).render(<App />);
