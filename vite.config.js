import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['d55d-2409-40e4-1057-eafd-26cd-f064-fa13-2128.ngrok-free.app'],
  }
});
