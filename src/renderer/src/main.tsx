import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('root element missing');

createRoot(container).render(
  <StrictMode>
    <App />
    <Toaster position="bottom-right" theme="system" richColors={false} closeButton={false} />
  </StrictMode>
);
