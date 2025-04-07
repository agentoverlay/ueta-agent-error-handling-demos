
// test-approve-order.js
// A simple script to test the order approval API

import fetch from 'node-fetch';

// Replace with your actual order ID
const ORDER_ID = "df4f54d3-586a-4276-865b-03255a004395";

async function testApproveOrder() {
  try {
    console.log(`Testing order approval for order ID: ${ORDER_ID}`);
    
    // Test with JSON format
    const jsonResponse = await fetch('http://localhost:3001/api/order/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId: ORDER_ID })
    });
    
    const jsonResult = await jsonResponse.json();
    console.log('JSON Request Result:', jsonResult);
    
    // Test with URL-encoded format
    const formResponse = await fetch('http://localhost:3001/api/order/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `orderId=${ORDER_ID}`
    });
    
    const formResult = await formResponse.json();
    console.log('Form-encoded Request Result:', formResult);
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApproveOrder();
