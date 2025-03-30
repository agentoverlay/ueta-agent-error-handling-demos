import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get the repository name from package.json or environment variables
const getRepositoryName = () => {
  // GitHub Pages deployment is usually in the format: https://username.github.io/repository/
  // So we need to set the base path as /repository/
  return '/ueta-agent-demos/ueta-liability-calculator/'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? getRepositoryName() : '/',
})
