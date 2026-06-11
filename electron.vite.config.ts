import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { index: resolve('src/main/index.ts') }
      }
    }
  },
  preload: {
    ssr: {
      noExternal: ['zod']
    },
    resolve: {
      alias: {
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/preload',
      externalizeDeps: {
        exclude: ['zod']
      },
      rollupOptions: {
        input: { index: resolve('src/preload/index.ts') },
        external: ['electron'],
        output: { format: 'cjs' }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: { settings: resolve('src/renderer/index.html') }
      }
    }
  }
});
