// src/lib/env.ts

// Environment variable configuration
export const env = {
  // API URL used by the frontend to connect to the API server
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  
  // Frontend URL where the Next.js app is served
  NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  
  // API server configuration (used server-side)
  API_PORT: parseInt(process.env.API_PORT || '3001'),
  SELLER_URL: process.env.SELLER_URL || 'http://localhost:4000',
  CONSUMER_URL: process.env.CONSUMER_URL || 'http://localhost:5002',
};