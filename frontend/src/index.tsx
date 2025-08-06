import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import './utils/clearAuth'; // Temporarily disabled to prevent auto token clearing
import './utils/testAuth';

// Prevent duplicate custom element registration errors during hot reloading
const originalDefine = window.customElements.define;
window.customElements.define = function(name, constructor, options) {
  if (!window.customElements.get(name)) {
    originalDefine.call(this, name, constructor, options);
  } else {
    console.warn(`Custom element "${name}" already defined, skipping registration`);
  }
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 