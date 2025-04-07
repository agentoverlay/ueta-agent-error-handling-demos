// debug-seller-api.js
import fetch from 'node-fetch';

const SELLER_URL = process.env.SELLER_URL || 'http://localhost:4000';

async function testSellerAPI() {
  try {
    console.log(`Testing seller API at ${SELLER_URL}...`);
    
    // Test health endpoint
    const healthResponse = await fetch(`${SELLER_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health endpoint:', healthData);
    } else {
      console.log('Health endpoint failed:', healthResponse.status);
    }
    
    // Test stats endpoint
    const statsResponse = await fetch(`${SELLER_URL}/stats`);
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('Stats endpoint:', statsData);
    } else {
      console.log('Stats endpoint failed:', statsResponse.status);
    }
    
    // Test products endpoint
    const productsResponse = await fetch(`${SELLER_URL}/products`);
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      console.log('Products endpoint:', productsData.length, 'products found');
    } else {
      console.log('Products endpoint failed:', productsResponse.status);
    }
    
    console.log('Test completed.');
  } catch (error) {
    console.error('Error testing seller API:', error);
  }
}

testSellerAPI();
