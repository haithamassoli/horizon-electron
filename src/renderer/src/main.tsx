import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { App } from './App';
import { PopoverView } from './views/PopoverView';
import { OverlayPrimaryView } from './views/OverlayPrimaryView';
import { OverlaySecondaryView } from './views/OverlaySecondaryView';
import { PreWarningView } from './views/PreWarningView';
import { BlinkPulseView } from './views/BlinkPulseView';
import { OnboardingView } from './views/OnboardingView';
import { ThemeProvider } from './components/ThemeProvider';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('root element missing');

const hash = window.location.hash;

function pickRoute(): {
  view:
    | 'settings'
    | 'popover'
    | 'overlay-primary'
    | 'overlay-secondary'
    | 'pre-warning'
    | 'blink'
    | 'onboarding';
  bodyClass: string | null;
} {
  if (hash.startsWith('#/popover')) return { view: 'popover', bodyClass: 'popover-host' };
  if (hash.startsWith('#/overlay/primary'))
    return { view: 'overlay-primary', bodyClass: 'overlay-host overlay-host-primary' };
  if (hash.startsWith('#/overlay/secondary'))
    return { view: 'overlay-secondary', bodyClass: 'overlay-host overlay-host-secondary' };
  if (hash.startsWith('#/pre-warning'))
    return { view: 'pre-warning', bodyClass: 'pre-warning-host-body' };
  if (hash.startsWith('#/blink')) return { view: 'blink', bodyClass: 'blink-host' };
  if (hash.startsWith('#/onboarding'))
    return { view: 'onboarding', bodyClass: 'onboarding-host' };
  return { view: 'settings', bodyClass: null };
}

const route = pickRoute();
if (route.bodyClass) {
  for (const cls of route.bodyClass.split(' ')) document.body.classList.add(cls);
}

function renderRoute() {
  switch (route.view) {
    case 'popover':
      return <PopoverView />;
    case 'overlay-primary':
      return <OverlayPrimaryView />;
    case 'overlay-secondary':
      return <OverlaySecondaryView />;
    case 'pre-warning':
      return <PreWarningView />;
    case 'blink':
      return <BlinkPulseView />;
    case 'onboarding':
      return <OnboardingView />;
    case 'settings':
    default:
      return (
        <>
          <App />
          <Toaster
            position="bottom-right"
            theme="system"
            richColors={false}
            closeButton={false}
          />
        </>
      );
  }
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>{renderRoute()}</ThemeProvider>
  </StrictMode>
);
