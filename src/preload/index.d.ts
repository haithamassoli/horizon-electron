import type { HorizonApi } from './index';

declare global {
  interface Window {
    horizon: HorizonApi;
  }
}

export {};
