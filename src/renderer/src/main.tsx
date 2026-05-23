import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { App } from './App';
import { PopoverView } from './views/PopoverView';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('root element missing');

const isPopover = window.location.hash.startsWith('#/popover');
if (isPopover) document.body.classList.add('popover-host');

createRoot(container).render(
  <StrictMode>
    {isPopover ? (
      <PopoverView />
    ) : (
      <>
        <App />
        <Toaster position="bottom-right" theme="system" richColors={false} closeButton={false} />
      </>
    )}
  </StrictMode>
);
