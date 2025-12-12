import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    build: {
      outDir: 'dist/main',
      minify: 'esbuild', // Faster minification
      sourcemap: false, // No sourcemaps for faster startup
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
        output: {
          // Optimize for fast startup
          format: 'es',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    build: {
      outDir: 'dist/preload',
      minify: 'esbuild', // Minify for smaller size and faster load
      sourcemap: false, // No sourcemaps for faster startup
      rollupOptions: {
        output: {
          format: 'cjs',
          inlineDynamicImports: true,
          entryFileNames: '[name].cjs'
        },
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    plugins: [react()],
    build: {
      outDir: 'dist/renderer',
      // Windows-specific optimizations for faster load times
      minify: 'esbuild', // esbuild is faster than terser for startup
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Manual chunks for better caching and faster loads
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'virtual-vendor': ['react-window', 'react-virtualized-auto-sizer']
          },
          // Smaller chunk names for faster parsing on Windows
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Target modern browsers only (since we control the Electron version)
      target: 'esnext',
      // Optimize for production startup
      reportCompressedSize: false, // Faster builds
      sourcemap: false // No sourcemaps in production for faster loads
    }
  }
});
