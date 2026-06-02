import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Pure-logic unit tests for src/ and server/ run in Node (no DOM needed).
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}', 'server/**/*.test.js'],
  },
  server: {
    port: 5175,
    allowedHosts: ['drift-earring-staple.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4175,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});
