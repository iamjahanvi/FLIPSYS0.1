import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        __DEV__: !isProduction,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2022',
        sourcemap: !isProduction,
        minify: isProduction ? 'terser' : false,
        terserOptions: isProduction ? {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          mangle: true,
        } : undefined,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'pdf-vendor': ['react-pdf', 'pdfjs-dist'],
              'animation-vendor': ['framer-motion', 'gsap'],
              'ui-vendor': ['lucide-react'],
            },
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: (assetInfo) => {
              const info = assetInfo.name || '';
              if (info.endsWith('.css')) return 'assets/[name]-[hash][extname]';
              if (/\.(woff2?|ttf|otf|eot)$/.test(info)) return 'assets/fonts/[name][extname]';
              return 'assets/[name]-[hash][extname]';
            },
          },
        },
        chunkSizeWarningLimit: 1000,
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-pdf', 'pdfjs-dist'],
        exclude: [],
      },
    };
});
