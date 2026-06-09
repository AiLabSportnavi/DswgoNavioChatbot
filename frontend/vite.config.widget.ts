import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Standalone build for the embeddable widget: a single self-contained IIFE
// (React + chat + consent + styles) that mounts into a Shadow DOM on the host page.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/embed/widget.tsx',
      name: 'NavioWidget',
      formats: ['iife'],
      fileName: () => 'navio-widget.js',
    },
  },
})
