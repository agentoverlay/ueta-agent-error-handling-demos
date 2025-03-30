import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get the repository name from package.json or environment variables
const getRepositoryName = () => {
  return '/'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? getRepositoryName() : '/',
})
