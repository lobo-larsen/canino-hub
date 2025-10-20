import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/canino-hub/',
  plugins: [react()],
  server: {
    port: 3001,
    host: true, // Allow access from network
    open: true,
    allowedHosts: ['soft-bugs-lose.loca.lt', '.loca.lt'] // Allow localtunnel hosts
  }
})

