import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { pluginManager } from '@tapdev/core';
import { initNativeBridge } from './lib/native-bridge';
import './index.css';

pluginManager.loadBuiltinPlugins();
initNativeBridge();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
