import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// ─── Persistent Storage Polyfill ────────────────────────────────
// Mirrors the window.storage API used in the Claude artifact,
// backed by localStorage for real deployment.
if (!window.storage) {
  const PREFIX = 'fcc-nets::';

  window.storage = {
    get: async (key, shared = false) => {
      try {
        const val = localStorage.getItem(PREFIX + key);
        if (val === null) throw new Error('Key not found');
        return { key, value: val, shared };
      } catch (e) {
        throw e;
      }
    },
    set: async (key, value, shared = false) => {
      try {
        localStorage.setItem(PREFIX + key, value);
        return { key, value, shared };
      } catch (e) {
        throw e;
      }
    },
    delete: async (key, shared = false) => {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true, shared };
    },
    list: async (prefix = '', shared = false) => {
      const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX + prefix))
        .map(k => k.slice(PREFIX.length));
      return { keys, prefix, shared };
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
