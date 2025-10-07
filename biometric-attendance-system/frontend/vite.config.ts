// frontend/vite.config.ts - UPDATED WITH HTTPS
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Function to generate self-signed certificate for development
function createSelfSignedCert() {
  const keyPath = path.resolve(__dirname, 'certs/key.pem')
  const certPath = path.resolve(__dirname, 'certs/cert.pem')
  
  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return { key: keyPath, cert: certPath }
  }
  
  // Create certs directory if it doesn't exist
  const certsDir = path.dirname(keyPath)
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true })
  }
  
  console.log('\n⚠️  HTTPS certificates not found!')
  console.log('🔧 Please generate self-signed certificates for development:')
  console.log('')
  console.log('Run these commands in your frontend directory:')
  console.log('mkdir -p certs')
  console.log('openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"')
  console.log('')
  console.log('Or on Windows (with OpenSSL installed):')
  console.log('mkdir certs')
  console.log('openssl req -x509 -newkey rsa:4096 -keyout certs\\key.pem -out certs\\cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"')
  console.log('')
  console.log('After generating certificates, restart the dev server.')
  console.log('')
  
  return null
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/context': path.resolve(__dirname, './src/context'),
      WebSdk: path.resolve(__dirname, 'src/shims/websdk-shim.js'),
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 3000,
    host: true,
    // Enable HTTPS for biometric features (WebAuthn requires HTTPS)
    ...(createSelfSignedCert() ? {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, 'certs/key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem')),
      }
    } : {}),
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false, // Allow self-signed certificates in development
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      
      external: ['WebSdk'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'recharts'],
          utils: ['axios', 'date-fns', 'clsx'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['WebSdk'],
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
  },
})


  // optimizeDeps: { // avoid dependency optimization error
  // },
  // build: {
  //   outDir: 'dist',
  //   sourcemap: true,
  //   rollupOptions: {
  //     external: ['WebSdk'], // avoid bundling WebSdk